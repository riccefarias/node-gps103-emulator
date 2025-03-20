const config = require('./config/config');
const { generateValidRoute, getRoute, decodePolyline } = require('./services/routeService');
const TcpService = require('./services/tcpService');

async function main() {
    try {
        console.log(`IMEI: ${config.imei}`);
        
        let route;
        if (config.startLat && config.startLng && config.endLat && config.endLng) {
            // Usa as coordenadas fornecidas
            route = {
                start: { lat: parseFloat(config.startLat), lng: parseFloat(config.startLng) },
                destination: { lat: parseFloat(config.endLat), lng: parseFloat(config.endLng) }
            };
            console.log('Usando coordenadas fornecidas:', route);
        } else {
            // Gera uma rota aleatória se não houver coordenadas
            route = await generateValidRoute();
            console.log('Rota gerada:', route);
        }

        const encodedRoute = await getRoute(
            [route.start.lat, route.start.lng],
            [route.destination.lat, route.destination.lng]
        );

        const decodedRoute = decodePolyline(encodedRoute);
        const routePoints = decodedRoute.map(point => `${point.lat/10} ${point.lon/10}`);

        const tcpService = new TcpService();
        tcpService.start(routePoints);
    } catch (error) {
        console.error('Erro ao iniciar aplicação:', error);
        process.exit(1);
    }
}

main(); 