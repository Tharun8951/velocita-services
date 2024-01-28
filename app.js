const PORT = process.env.PORT || 8081

const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const {
  updateVehicleLocation,
  getNearbyVehicles,
  updateAmbulanceLocation,
  getNearByAmbulances,
} = require('./controllers/redisMethods')

const { handleGetListOfCoords, getRoadCondition } = require('./controllers/externalApi')
const { realTimeLocationSystem } = require('./controllers/rtls')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
  },
})

app.use(
  cors({
    origin: '*',
  }),
)

app.get('/home', (req, res) => {
  res.json({
    msg: 'This is the home page response',
  })
})

io.on('connection', (socket) => {
  console.log(socket.id)

  socket.on('postGetNearbyAmbulance', async ({ values }) => {
    const lat = values.lat
    const long = values.long
    const pin = values.pin

    console.log(lat, long, pin)
    const getNearByAmbulancesArr = await getNearByAmbulances(pin, long, lat)
    console.log(getNearByAmbulancesArr)

    if (getNearByAmbulancesArr.length == 0) {
      io.to(socket.id).emit('postGetNearbyAmbulance-result', {
        msg: 'could not find any ambulance near you',
      })
    } else {
      // send data to client side
      io.to(socket.id).emit(
        'postGetNearbyAmbulance-result',
        getNearByAmbulancesArr,
      )
    }
  })

  // Vehicle updating location
  socket.on('loc-upd', async function ({ coordinates }) {
    console.log(`{
      type: "vehicle",
      lat: ${coordinates.lat},
      long: ${coordinates.lon},
      pincode: ${coordinates.pin},
      id: ${socket.id}
    }`)

    // Store data in redis
    const res = await updateVehicleLocation(
      coordinates.pin,
      coordinates.lon,
      coordinates.lat,
      socket.id,
    )
    io.to(socket.id).emit('event-status', {
      msg: 'updated vehicle location',
      response: res,
    })
    console.log(res)
  })

  // temp array variable
  var arrayCord = []
  var finalSockets = []

  socket.on('create-alert', async function ({ coordinates }) {
    // origin latitude and longitude
    const originLat = coordinates.origin.lat
    const originLon = coordinates.origin.lon

    // destination Latitude and Longitude
    const destLat = coordinates.destination.lat
    const destLon = coordinates.destination.lon

    // pincode
    const originPin = coordinates.pin

    // fetching the coordinates between origin and destination
    const resCoordinates = await handleGetListOfCoords(
      originLat,
      originLon,
      destLat,
      destLon,
      560087,
    )

    if (resCoordinates.length === 0) {
      console.log('error')
    } else {
      // Process the coordinates array
      const promises = resCoordinates.map(async (coord) => {
        const latitude = coord.latitude
        const longitude = coord.longitude

        // console.log(`Long: ${longitude}, Lat: ${latitude}`)
        arrayCord.push({ long: longitude, lat: latitude })
      })

      await Promise.all(promises)
      // console.log(arrayCord)

      // calling redis getNearByVehicles to all the resCoordinates and sending alerts
      const finalSocketsPromises = arrayCord.map(async (coords) => {
        return getNearbyVehicles(originPin, coords.long, coords.lat)
      })

      const nestedArrays = await Promise.all(finalSocketsPromises)

      // Flatten the nested arrays into a single array
      finalSockets = nestedArrays.flat()

      if (finalSockets.length === 0) {
        console.log('could not find any id')
      }
    }
    console.log(finalSockets)
    finalSockets.map((socketId) => {
      io.to(socketId).emit('amb-alert', {lat: originLat,  lon: originLon})
      io.to(socket.id).emit('event-status', 'successfully created event')
      console.log(socketId)
    })
  })

  socket.on('amb-loc-upd', async ({ coordinates }) => {
    const res = await realTimeLocationSystem(socket.id, coordinates)
    if (res == 'success') {
      console.log(`Location update successfull - ${socket.id}`)
      io.to(socket.id).emit('amb-loc-upd-status', {})
    } else if (res == 'error') {
      console.log(`Error at location update - ${socket.id}`)
      io.to(socket.id).emit('amb-loc-upd-status', {
        msg: 'Error updating location',
      })
    }
  })

  socket.on('upd-amb-live-loc', async ({ coordinates }) => {
    console.log(`{
      type: "ambulance",
      lat: ${coordinates.lat},
      long: ${coordinates.lon},
      pincode: ${coordinates.pin},
      id: ${socket.id}
    }`)
    // Store data in redis
    const res = await updateAmbulanceLocation(
      coordinates.pin,
      coordinates.lon,
      coordinates.lat,
      socket.id,
    )
    io.to(socket.id).emit('event-status', {
      msg: 'updated ambulance location',
      response: res,
    })
    console.log(res)
  })

  //road status 
  socket.on('roadStatus', ({ coordinates }) => {
    console.log(coordinates)
    const res =  getRoadCondition(coordinates)
    io.to(socket.id).emit('roadStatusRes', {
      msg: res
    })
  })
})

server.listen(PORT, () => {
  console.log(`Server started at port: ${PORT}`)
})
