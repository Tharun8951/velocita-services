// importing redis client
const { redisClient } = require('../redis/redisClient')

/**
 * updateVehicleLocation method takes in 4 parameters ->
 * 1. pincode
 * 2. longitude
 * 3. latitude
 * 4. socket.id
 * This method needs to be used only with Vehicles
 * - Returns 1 or 0, 1 if adding data was success and 0 for error
 **/
const updateVehicleLocation = async (pincode, lon, lat, socketId) => {
  // socketId = "xXre7XM9A-CfuNwPAAAB"
  // lat = 13.050572
  // lon = 80.098132
  //Adding to redis using GEOADD
  try {
    const removeEle = await redisClient.zRem(String(pincode), socketId)
    console.log(removeEle)
    const res = await redisClient.geoAdd(String(pincode), {
      longitude: lon,
      latitude: lat,
      member: socketId,
    })

    if (res == 1) {
      return `Location update at redis is OK! - ${socketId}`
    } else {
    }
  } catch (error) {
    return `Error at updating location! - ${socketId}`
  }
}

/**
 * getNearbyVehicles method takes in 3 parameters ->
 * 1. pincode
 * 2. longitude
 * 3. latitude
 * The default radius and unit for this function is 0.1 km or 100 meters
 * This method needs to be used only for ambulance
 * - returns list of socketIds or vehicleIds if query matches
 */
const getNearbyVehicles = async (pincode, lon, lat) => {
  const finalSockets = []
  try {
    console.log(pincode, lon, lat)
    if (!redisClient) {
      throw new Error('Redis client not initialized')
    }

    if (!pincode || isNaN(lon) || isNaN(lat)) {
      throw new Error('Invalid parameters for geoSearch')
    }

    const res = await redisClient.geoSearch(
      String(pincode),
      {
        longitude: lon,
        latitude: lat,
      },
      {
        radius: 200,
        unit: 'm',
      },
    )

    // console.log(`Redis GeoSearch Results: ${res}`);
    if (res.length >= 0) {
      res.map((id) => {
        // console.log(id)
        finalSockets.push(id)
      })
      return finalSockets
    } else {
      return []
    }
  } catch (error) {
    console.error('Error fetching nearby vehicles:', error.message)
    return []
  }
}

const updateAmbulanceLocation = async (pincode, lon, lat, socketId) => {
  // socketId = "poazRUhZ2u9UKnSfAAAB"
  // lat = 13.050572
  // lon = 80.098132

  try {
    const removeEle = await redisClient
      .zRem(String(pincode), socketId)
      .then(() => {})
    console.log(removeEle)
    const res = await redisClient.geoAdd(String(pincode), {
      longitude: lon,
      latitude: lat,
      member: socketId,
    })

    if (res === 1) {
      return `Location update for ambulance in Redis is OK! - ${socketId}`
    } else {
      console.log(
        `Error updating ambulance location: ${error.message}, ${error}`,
      )
      return `Error updating ambulance location! - ${socketId}. ${error}`
    }
  } catch (error) {
    console.log(`Error updating ambulance location: ${error.message}, ${error}`)
    return `Error updating ambulance location! - ${socketId}. ${error}`
  }
}

const getNearByAmbulances = async (pincode, long, lat) => {
  try {
    const socketIds = await redisClient.geoSearch(
      String(pincode),
      {
        longitude: long,
        latitude: lat,
      },
      {
        radius: 400,
        unit: "m",
      }
    );

    const coordinatesWithSocketIds = await Promise.all(
      socketIds.map(async (socketId) => {
        const coordinates = await redisClient.geoPos(String(pincode), socketId);
        // return JSON.stringify({ socketId, coordinates })
        return JSON.stringify({ coordinates })
      })
    );
    // console.log(coordinatesWithSocketIds)
    return coordinatesWithSocketIds;
  } catch (error) {
    console.error("Error fetching nearby ambulances:", error.message);
    return [];
  }
};


module.exports = {
  updateVehicleLocation,
  getNearbyVehicles,
  updateAmbulanceLocation,
  getNearByAmbulances
}
