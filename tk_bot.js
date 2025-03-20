

const axios = require('axios');


const Net = require('net');

const fs = require('fs');


const EARTH_RADIUS = 6371000; // Raio da Terra em metros
const MAX_DISTANCE = 1000000; // 7.000 km


var host = process.env.ip || '37.27.17.12';
var port = process.env.port || 5001;
var odometer = 0;
let imei = process.env.imei || '867111061137921';

console.log(imei);

const linhas = [];

async function isOnLand(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    try {
        const response = await axios.get(url);
        return response.data.address && response.data.address.country; // Retorna true se houver país associado
    } catch (error) {
        return false;
    }
}

function haversineDistance(coord1, coord2) {
    function toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    const lat1 = toRad(coord1.lat);
    const lat2 = toRad(coord2.lat);
    const deltaLat = toRad(coord2.lat - coord1.lat);
    const deltaLng = toRad(coord2.lng - coord1.lng);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS * c; // Retorna a distância em metros
}

async function generateValidRoute() {
    const boundingBoxes = [
        [-6.008113207697144, -65.33976311858397, 4.785817506182841, -36.687421712194116],  // Norte/Nordeste BR
        [-32.13726216074262, -62.527263348631585, -29.648691997959236, -52.59562353598728] // Sul BR/Argentina
    ];

    let start, destination, distance;

    do {
        const bbox = boundingBoxes[Math.floor(Math.random() * boundingBoxes.length)];
        start = getRandomCoordinate(bbox);

        if (!(await isOnLand(start.lat, start.lng))) continue; // Se estiver no mar, gera outro

        destination = getRandomCoordinate(bbox);

        if (!(await isOnLand(destination.lat, destination.lng))) continue; // Garante que o destino também esteja em terra

        distance = haversineDistance(start, destination);
        
    } while (distance > MAX_DISTANCE); // Garante que a distância não ultrapasse 7.000 km

    return { start, destination, distance };
}

// Função para decodificar a polilinha (usa @mapbox/polyline)
const polyline = require('@mapbox/polyline');
function decodePolyline(encoded) {
    return polyline.decode(encoded).map(([lat, lon]) => ({ lat, lon }));
}


// Configuração do servidor Valhalla local
const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/route';

// Função para obter a rota via GET
async function getRoute(start, end) {
    const url = `${VALHALLA_URL}?json={"locations":[{"lat":${start[0]},"lon":${start[1]}},{"lat":${end[0]},"lon":${end[1]}}],"costing":"auto","directions_options":{"units":"kilometers"}}`;

    const response = await axios.get(url);
    return response.data.trip.legs[0].shape; // Retorna a polilinha codificada
}
function getRandomCoordinate(bbox) {
    const [minLat, minLng, maxLat, maxLng] = bbox;
    
    const lat = Math.random() * (maxLat - minLat) + minLat;
    const lng = Math.random() * (maxLng - minLng) + minLng;
    
    return { lat, lng };
}

generateValidRoute().then((pos)=>{

console.log(pos);

getRoute([pos.start.lat,pos.start.lng],[pos.destination.lat,pos.destination.lng]).then((encodedRoute)=>{
    const route = decodePolyline(encodedRoute);



    route.forEach((p)=>{
	linhas.push((p.lat/ 10)+" "+(p.lon/ 10));
    });


    start();

});

});

function angle(cx, cy, ex, ey) {
  var dy = ey - cy;
  var dx = ex - cx;
  var theta = Math.atan2(dy, dx); // range (-PI, PI]
  theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
  return theta;
}
function angle360(cx, cy, ex, ey) {
  var theta = angle(cx, cy, ex, ey); // range (-180, 180]
  if (theta < 0) theta = 360 + theta; // range [0, 360)
  return theta;
}


function place(lat,lng,course,speed,ignition,e=false){

	odometer = odometer+50000;

	const sat = Math.round((Math.random()*15)+3);

	const fakeBat = Math.round(Math.random()*10);

	const _power = parseFloat(Math.random()+12).toFixed(2);
	const _bat = parseFloat(Math.random()+3).toFixed(2);
	const _batPct = Math.round((Math.random()*95)+5);
	const rssi = Math.round((Math.random()*95)+5);

	const _date = new Date().toISOString().split("T");
	const _dt = _date[0].split("-");
	const _hr = _date[1].split(":");
	const data = _dt[0].substring(2,4)+''+_dt[1]+''+_dt[2];
	const time = _hr[0]+''+_hr[1]+''+_hr[2].split(".")[0];

console.log(lat);

	const _latS = lat.split(".");
	const _lngS = lng.split(".");
	let SN = 'S';
	let EW = 'W';

	const latMin = (parseFloat("0."+_latS[1]) * 60).toFixed(4);
	const lonMin = (parseFloat("0."+_lngS[1]) * 60).toFixed(4);


	let _lat = _latS[0]+''+((String(latMin).indexOf(".")===1)?'0':'')+latMin;
	let _lng = _lngS[0]+''+((String(lonMin).indexOf(".")===1)?'0':'')+lonMin;
	if(_latS[0]>0){
		SN = 'N';
	}
	if(_lngS[0]>0){
		EW = 'E';
	}

	

	let bat = '';
	if(fakeBat>4){
		bat = '&power=0&batteryLevel='+_batPct+'&battery='+_bat;
	}else{
		bat = '&power='+_power;
	}

	
	
	const send = 'imei:'+imei+','+((e)?e:'tracker')+','+data+''+time+',0000000,F,'+time+'.00,A,'+_lat.replace('-','')+','+SN+','+_lng.replace('-','')+','+EW+','+speed+','+course+',0,'+((ignition)?1:0)+';';

	client.write(send);

	console.log("placed "+send);

}


let pos = 0;
let engine = true;
let _timer = null;

function placeEvent(e){
	const coords = linhas[pos].trim().split(" ");
	let course = 0;
	if(pos===0){
		course = 0;
	}else{
		const coordsAnt = linhas[pos-1].trim().split(" ");
		course = angle360(coordsAnt[0],coordsAnt[1],coords[0],coords[1]);
	}

	place(coords[0],coords[1],course,Math.floor((Math.random()*39)+4),!(pos>=(linhas.length-1)),e)

}

function placeNew(){
	const coords = linhas[pos].trim().split(" ");
	let course = 0;
	if(pos===0){
		course = 0;
	}else{
		const coordsAnt = linhas[pos-1].trim().split(" ");
		course = angle360(coordsAnt[0],coordsAnt[1],coords[0],coords[1]);
	}

	place(coords[0],coords[1],course,(pos>=(linhas.length-1) || pos===0)?0:(Math.floor((Math.random()*29)+4)),engine)

	if(engine){
		pos = pos + 2;
	}
	if(pos>(linhas.length-1)){
		pos = 0;
		_timer = setTimeout(placeNew,300000);
	}else{		
		_timer = setTimeout(placeNew,((Math.random()*3)+15)*1000);
	}


}

const client = new Net.Socket();
let started = false;
let unlocker = null;

function start(){
client.connect({ port: port, host: host }, function() {
	console.log("connected");

	client.write("##,imei:"+imei+",A;");

	//placeNew();
});

// The client can also receive data from the server by reading from its socket.
client.on('data', function(chunk) {
    console.log(`Data received from the server: ${chunk.toString()}.`);

	const str = chunk.toString();

	console.log(str);

	if(str==='LOAD'){
		if(!started){
			started = true;
			placeNew();
		}
	}else if(str.substr(0,2)==='**'){
		const cmd = str.split(",");

		if(cmd[2]==='J'){
			console.log("bloquear");
			placeEvent("jt");
			clearTimeout(_timer);


			unlocker = setTimeout(()=>{				
				placeEvent("kt");
				_timer = setTimeout(placeNew,((Math.random()*7)+7)*850);
			},300000);
		}else if(cmd[2]==='K'){
			console.log("desbloquear");
			placeEvent("kt");
			_timer = setTimeout(placeNew,((Math.random()*7)+7)*850);
			clearTimeout(unlocker);
		}else if(cmd[2]==='I'){
			console.log("desligar motor");

			engine = false;
			

			//placeNew();

			//clearTimeout(_timer);

	
		}else if(cmd[2]==='E'){
			console.log("ligar mtoor");
			engine = true;


			//placeNew();

			//_timer = setTimeout(placeNew,((Math.random()*7)+7)*850);

		}
	}
});

client.on('end', function() {
    console.log('Requested an end to the TCP connection');
});

}