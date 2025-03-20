require('dotenv').config();

const config = {
    host: process.env.ip || '37.27.17.12',
    port: process.env.port || 5001,
    imei: process.env.imei || '867111061137921',
    startLat: process.env.startLat || null,
    startLng: process.env.startLng || null,
    endLat: process.env.endLat || null,
    endLng: process.env.endLng || null,
    earthRadius: 6371000, // Raio da Terra em metros
    maxDistance: 1000000, // 1.000 km
    valhallaUrl: 'https://valhalla1.openstreetmap.de/route',
    boundingBoxes: [
        [-6.008113207697144, -65.33976311858397, 4.785817506182841, -36.687421712194116],  // Norte/Nordeste BR
        [-32.13726216074262, -62.527263348631585, -29.648691997959236, -52.59562353598728] // Sul BR/Argentina
    ]
};

module.exports = config; 