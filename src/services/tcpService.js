const Net = require('net');
const config = require('../config/config');
const { angle360 } = require('../utils/mathUtils');

class TcpService {
    constructor() {
        this.client = new Net.Socket();
        this.started = false;
        this.unlocker = null;
        this.engine = true;
        this.pos = 0;
        this.odometer = 0;
        this.linhas = [];
        this._timer = null;
    }

    formatCoordinates(lat, lng) {
        const _latS = lat.toString().split(".");
        const _lngS = lng.toString().split(".");
        let SN = 'S';
        let EW = 'W';

        const latMin = (parseFloat("0."+_latS[1]) * 60).toFixed(4);
        const lonMin = (parseFloat("0."+_lngS[1]) * 60).toFixed(4);

        let _lat = _latS[0].replace('-','')+''+((String(latMin).indexOf(".")===1)?'0':'')+latMin;
        let _lng = _lngS[0].replace('-','')+''+((String(lonMin).indexOf(".")===1)?'0':'')+lonMin;

        if(parseFloat(lat) > 0) SN = 'N';
        if(parseFloat(lng) > 0) EW = 'E';

        return { _lat, _lng, SN, EW };
    }

    generateBatteryData() {
        const fakeBat = Math.round(Math.random()*10);
        const _power = parseFloat(Math.random()+12).toFixed(2);
        const _bat = parseFloat(Math.random()+3).toFixed(2);
        const _batPct = Math.round((Math.random()*95)+5);

        if(fakeBat>4) {
            return `&power=0&batteryLevel=${_batPct}&battery=${_bat}`;
        }
        return `&power=${_power}`;
    }

    place(lat, lng, course, speed, ignition, e=false) {
        this.odometer += 50000;
        const sat = Math.round((Math.random()*15)+3);
        const rssi = Math.round((Math.random()*95)+5);

        const _date = new Date().toISOString().split("T");
        const _dt = _date[0].split("-");
        const _hr = _date[1].split(":");
        const data = _dt[0].substring(2,4)+''+_dt[1]+''+_dt[2];
        const time = _hr[0]+''+_hr[1]+''+_hr[2].split(".")[0];

        const { _lat, _lng, SN, EW } = this.formatCoordinates(lat, lng);
        const bat = this.generateBatteryData();
        
        const send = `imei:${config.imei},${e || 'tracker'},${data}${time},0000000,F,${time}.00,A,${_lat.replace('-','')},${SN},${_lng.replace('-','')},${EW},${speed},${course},0,${ignition ? 1 : 0};`;

        this.client.write(send);
        console.log("placed "+send);
        console.log(`Position: ${lat}, ${lng}, Speed: ${speed}, Course: ${course}`);
    }

    placeEvent(e) {
        const coords = this.linhas[this.pos].trim().split(" ");
        let course = 0;
        
        if(this.pos !== 0) {
            const coordsAnt = this.linhas[this.pos-1].trim().split(" ");
            course = angle360(coordsAnt[0], coordsAnt[1], coords[0], coords[1]);
        }

        this.place(coords[0], coords[1], course, Math.floor((Math.random()*39)+4), !(this.pos>=(this.linhas.length-1)), e);
    }

    placeNew() {
        const coords = this.linhas[this.pos].trim().split(" ");
        let course = 0;
        
        if(this.pos !== 0) {
            const coordsAnt = this.linhas[this.pos-1].trim().split(" ");
            course = angle360(coordsAnt[0], coordsAnt[1], coords[0], coords[1]);
        }

        this.place(coords[0], coords[1], course, (this.pos>=(this.linhas.length-1) || this.pos===0) ? 0 : (Math.floor((Math.random()*29)+4)), this.engine);

        if(this.engine) {
            this.pos += 2;
        }

        if(this.pos > (this.linhas.length-1)) {
            this.pos = 0;
            this._timer = setTimeout(() => this.placeNew(), 300000);
        } else {
            this._timer = setTimeout(() => this.placeNew(), ((Math.random()*3)+15)*1000);
        }
    }

    handleCommand(str) {
        if(str === 'LOAD') {
            if(!this.started) {
                this.started = true;
                this.placeNew();
            }
        } else if(str.substr(0,2) === '**') {
            const cmd = str.split(",");

            switch(cmd[2]) {
                case 'J':
                    console.log("bloquear");
                    this.placeEvent("jt");
                    clearTimeout(this._timer);
                    this.unlocker = setTimeout(() => {
                        this.placeEvent("kt");
                        this._timer = setTimeout(() => this.placeNew(), ((Math.random()*7)+7)*850);
                    }, 300000);
                    break;
                case 'K':
                    console.log("desbloquear");
                    this.placeEvent("kt");
                    this._timer = setTimeout(() => this.placeNew(), ((Math.random()*7)+7)*850);
                    clearTimeout(this.unlocker);
                    break;
                case 'I':
                    console.log("desligar motor");
                    this.engine = false;
                    break;
                case 'E':
                    console.log("ligar motor");
                    this.engine = true;
                    break;
            }
        }
    }

    start(route) {
        this.linhas = route;
        
        this.client.connect({ port: config.port, host: config.host }, () => {
            console.log("connected");
            this.client.write(`##,imei:${config.imei},A;`);
        });

        this.client.on('data', (chunk) => {
            const str = chunk.toString();
            console.log(`Data received from the server: ${str}`);
            this.handleCommand(str);
        });

        this.client.on('end', () => {
            console.log('Requested an end to the TCP connection');
        });
    }
}

module.exports = TcpService; 