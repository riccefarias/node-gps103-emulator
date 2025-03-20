const config = require('../config/config');

function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

function haversineDistance(coord1, coord2) {
    const lat1 = toRad(coord1.lat);
    const lat2 = toRad(coord2.lat);
    const deltaLat = toRad(coord2.lat - coord1.lat);
    const deltaLng = toRad(coord2.lng - coord1.lng);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return config.earthRadius * c;
}

function angle(cx, cy, ex, ey) {
    const dy = ey - cy;
    const dx = ex - cx;
    let theta = Math.atan2(dy, dx);
    theta *= 180 / Math.PI;
    return theta;
}

function angle360(cx, cy, ex, ey) {
    let theta = angle(cx, cy, ex, ey);
    if (theta < 0) theta = 360 + theta;
    return theta;
}

function getRandomCoordinate(bbox) {
    const [minLat, minLng, maxLat, maxLng] = bbox;
    const lat = Math.random() * (maxLat - minLat) + minLat;
    const lng = Math.random() * (maxLng - minLng) + minLng;
    return { lat, lng };
}

module.exports = {
    haversineDistance,
    angle360,
    getRandomCoordinate
}; 