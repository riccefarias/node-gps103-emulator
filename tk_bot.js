

const axios = require('axios');
const _ = require('lodash');

const Net = require('net');

const fs = require('fs');


var host = process.env.ip || 'rastreargratis.com.br';
var port = process.env.port || 5001;
var odometer = 0;
let imei = 'KORE'+process.env.linha;

const linhas = [];

const instance = axios.create({
  baseURL: "https://www.trafeguebem.com.br/getLinha",
  timeout: 30000,
  withCredentials: true,
  validateStatus: function (status) {
    return status == 200; // Resolve only if the status code is less than 500
  }
});  



instance.get("/"+process.env.linha).then(({data})=>{
	data.geom.forEach((p)=>{
		linhas.push(p.lat+" "+p.lng);
	});
	console.log("start with",linhas);

	start();
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
