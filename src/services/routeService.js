const axios = require('axios');
const polyline = require('@mapbox/polyline');
const config = require('../config/config');
const { haversineDistance, getRandomCoordinate } = require('../utils/mathUtils');

async function isOnLand(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    try {
        const response = await axios.get(url);
        return response.data.address && response.data.address.country;
    } catch (error) {
        console.error('Erro ao verificar se coordenada está em terra:', error);
        return false;
    }
}

function decodePolyline(encoded) {
    return polyline.decode(encoded).map(([lat, lon]) => ({ lat, lon }));
}

async function getRoute(start, end) {
    try {
        const url = `${config.valhallaUrl}?json={"locations":[{"lat":${start[0]},"lon":${start[1]}},{"lat":${end[0]},"lon":${end[1]}}],"costing":"auto","directions_options":{"units":"kilometers"}}`;
        const response = await axios.get(url);
        return response.data.trip.legs[0].shape;
    } catch (error) {
        console.error('Erro ao obter rota:', error);
        throw error;
    }
}

async function generateValidRoute() {
    let start, destination, distance;

    do {
        const bbox = config.boundingBoxes[Math.floor(Math.random() * config.boundingBoxes.length)];
        start = getRandomCoordinate(bbox);

        if (!(await isOnLand(start.lat, start.lng))) continue;

        destination = getRandomCoordinate(bbox);

        if (!(await isOnLand(destination.lat, destination.lng))) continue;

        distance = haversineDistance(start, destination);
        
    } while (distance > config.maxDistance);

    return { start, destination, distance };
}

module.exports = {
    generateValidRoute,
    getRoute,
    decodePolyline
}; 