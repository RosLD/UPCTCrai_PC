const { SerialPort } = require('serialport')
const Database = require("better-sqlite3");
const mqtt = require("mqtt")
var CronJob = require('cron').CronJob;
const { ByteLengthParser } = require('@serialport/parser-byte-length')

/* CRON */

let msg = Buffer.from([0x00,0x55,0x08,0x00,0x00,0x00,0x00,0x7c])

var job = new CronJob(
	'00 00 07 * * *',
	function() {
		console.log('Good morning! Restarting both sensors');
        salidastotal = 0
        entradastotal = 0
        serialport1.write(msg)
        serialport2.write(msg)
	});

console.log("Starting CRON job");
job.start()

/*MQTT*/
const options = {
    clean: true, // retain session
connectTimeout: 4000, // Timeout period
// Authentication information
clientId: 'Raspberry6_PC',
username: 'Raspberry6_PC',
password: 'Raspberry6_PC',
}


const connectUrl = 'ws://10.147.18.134:8083/mqtt'
const client = mqtt.connect(connectUrl, options)

client.on('connect', function () {
        console.log("Connected to MQTT URL")
  })

/*SQLITE3 - Local storagement*/
const db = new Database("PersonCount.db")
const createTable = 
    "CREATE TABLE IF NOT EXISTS PersonCounter ('Timestamp','IdSensor','CuentaEntradaSensor','CuentaSalidaSensor','CuentaEntradaTotal','CuentaSalidaTotal')";
db.exec(createTable);

const insertInto = db.prepare(
    "INSERT INTO PersonCounter (Timestamp,IdSensor,CuentaEntradaSensor,CuentaSalidaSensor,CuentaEntradaTotal,CuentaSalidaTotal) VALUES (?,?,?,?,?,?)"
)



/* Timestamp*/
function pad(n, z){
    z = z || 2;
  return ('00' + n).slice(-z);
  }
  
  const getFechaCompleta = () => {
    let d = new Date,
    dformat =   [d.getFullYear(),
                pad(d.getMonth()+1),
                pad(d.getDate())].join('-')+' '+
                [pad(d.getHours()),
                pad(d.getMinutes()),
                pad(d.getSeconds())].join(':');
  
    return dformat;
} 


const serialport1 = new SerialPort({ //Derecho
    path : '/dev/ttyUSB0',
    baudRate: 115200,
    parity:'none',
    stopBits:1,
    dataBits:8,
    flowControl:false 
})

const serialport2 = new SerialPort({//Izquierdo
    path : '/dev/ttyACM0',
    baudRate: 115200,
    parity:'none',
    stopBits:1,
    dataBits:8,
    flowControl:false 
})


let entradastotal = 0
let salidastotal = 0
let horaactual;

let chain1 = ''
let subchain1 = ''
let salidasder = 0
let entradasder = 0
let param1 = {}

let chain2 = ''
let salidasizq = 0
let entradasizq = 0
let param2 = {}

console.log("DEMO CONTADOR PERSONAS BIBLIOTECA ANTIGONES")

/*let cfg = Buffer.from([0x00,0x61,0x01,0xe7]) //Save for ID and conf
serialport1.write(cfg)*/

/* ------------------SENSOR DERECHO ----------------------- */
const parser1 = serialport1.pipe(new ByteLengthParser({ length: 1 }))

parser1.on('data', function(buff){
    chain1 += buff.toString('hex')
    //console.log(chain1)

    if((chain1.length > 1024) && (!chain1.includes('5043'))){
        chain1 = ''
    }

    if(chain1.includes('5043')){
        if(chain1.split('5043')[1].length >= 26){
            subchain1 = chain1.split('5043')[1]
            chain1 = ''

            //Chain detected get Exits and entries
            entradasder = subchain1[16]+subchain1[17]+subchain1[18]+subchain1[19]
            salidasder = subchain1[20]+subchain1[21]+subchain1[22]+subchain1[23]

            console.log(`D- In:${entradasder} Out:${salidasder}`)
            console.log(`D- T_in:${entradastotal} T_out:${salidastotal}`)

            entradastotal = entradasder + entradasizq;
            salidastotal = salidasder + salidasizq;

            horaactual = getFechaCompleta()
            //Save in LOCAL
            insertInto.run(horaactual,"Right",entradasder,salidasder,entradastotal,salidastotal)

            //Send MQTT
            param1.timestamp = horaactual
            param1.sensor = "Right"
            param1.entradasSensor = entradasder
            param1.salidasSensor = salidasder
            param1.entradasTotal = entradastotal
            param1.salidasTotal = salidastotal
            client.publish("CRAIUPCTPersonCount",JSON.stringify(param1))

        }

    }
})

/* ----------------- SENSOR IZQUIERDO -------------------------- */

const parser2 = serialport2.pipe(new ByteLengthParser({ length: 1 }))

parser2.on('data', function(buff){
    chain2 += buff.toString('hex')
    //console.log(chain1)

    if((chain2.length > 1024) && (!chain2.includes('5043'))){
        chain2 = ''
    }

    if(chain2.includes('5043')){
        if(chain2.split('5043')[1].length >= 26){
            subchain2 = chain2.split('5043')[1]
            chain2 = ''

            //Chain detected get Exits and entries
            entradasizq = subchain2[16]+subchain2[17]+subchain2[18]+subchain2[19]
            salidasizq = subchain2[20]+subchain2[21]+subchain2[22]+subchain2[23]

            console.log(`D- In:${entradasizq} Out:${salidasizq}`)
            console.log(`D- T_in:${entradastotal} T_out:${salidastotal}`)
            
            entradastotal = entradasder + entradasizq;
            salidastotal = salidasder + salidasizq;

            horaactual = getFechaCompleta()
            //Save in LOCAL
            insertInto.run(horaactual,"Left",entradasizq,salidasizq,entradastotal,salidastotal)

            //Send MQTT
            param2.timestamp = horaactual
            param2.sensor = "Left"
            param2.entradasSensor = entradasizq
            param2.salidasSensor = salidasizq
            param2.entradasTotal = entradastotal
            param2.salidasTotal = salidastotal
            client.publish("CRAIUPCTPersonCount",JSON.stringify(param2))
        }

    }
})

