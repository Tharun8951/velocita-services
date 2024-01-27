const axios = require('axios');
const getRouteCoordinatesUrl = 'http://localhost:8080/getCoordsFromOriginToDest/';

const handleGetListOfCoords = async (originLat, originLon, destLat, destLon, pincode) => {
    const urlWithCoords = `${getRouteCoordinatesUrl}${originLat}/${originLon}/${destLat}/${destLon}/${pincode}`;
    console.log(urlWithCoords);

    const coordinates = [];

    try {
        // Make a GET request to the Go server
        const response = await axios.get(urlWithCoords);

        // Access the "coordinates" array from the JSON response
        const responseCoordinates = response.data.coordinates;

        // Iterate through the coordinates array
        responseCoordinates.forEach(coord => {
            const latitude = coord[0];
            const longitude = coord[1];

            // Push coordinates to the array
            coordinates.push({ latitude, longitude });
        });
        
        // Return the array of coordinates
        // console.log(coordinates)
        return coordinates;
    } catch (error) {
        console.error('Error fetching data:', error.message);
        // Return an empty array or handle the error accordingly
        return [];
    }
};

module.exports = { handleGetListOfCoords };
