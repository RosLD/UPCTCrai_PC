const { SerialPort } = require('serialport')
const Database = require("better-sqlite3");
const mqtt = require("mqtt")
var CronJob = require('cron').CronJob;
const { ByteLengthParser } = require('@serialport/parser-byte-length')

/* CRON */

let msg = Buffer.from([0x00,0x55,0x08,0x00,0x00,0x00,0x00,0x7c])

var job = new CronJob(
	'00 45 06 * * *',
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
    "CREATE TABLE IF NOT EXISTS PersonCounter ('Timestamp','IdSensor','EventoIO','entradasDer','entradasIzq','entradasTotal','salidasDer','salidasIzq','salidasTotal')";
db.exec(createTable);

const insertInto = db.prepare(
    "INSERT INTO PersonCounter (Timestamp,IdSensor,EventoIO,entradasDer,entradasIzq,entradasTotal,salidasDer,salidasIzq,salidasTotal) VALUES (?,?,?,?,?,?,?,?,?)"
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

const isodate =() =>{
    return new Date().toISOString();
}


const serialport1 = new SerialPort({ //Derecho
    path : '/dev/ttyACM0',
    baudRate: 115200,
    parity:'none',
    stopBits:1,
    dataBits:8,
    flowControl:false 
})

const serialport2 = new SerialPort({//Izquierdo
    path : '/dev/ttyUSB0',
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
let aux1 = 0
let param1 = {}

let chain2 = ''
let subchain2 = ''
let salidasizq = 0
let entradasizq = 0
let aux2 = 0
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
            aux1 = parseInt(subchain1[16]+subchain1[17]+subchain1[18]+subchain1[19],16)

            if(aux1 > entradasder)
                param1.eventoIO = true
            

            entradasder = aux1

            aux1 = parseInt(subchain1[20]+subchain1[21]+subchain1[22]+subchain1[23],16)

            if(aux1 > salidasder)
                param1.eventoIO = false

            salidasder = aux1
            

            entradastotal = entradasder + entradasizq;
            salidastotal = salidasder + salidasizq;

            console.log(`D- In:${entradasder} Out:${salidasder}`)
            console.log(`D- T_in:${entradastotal} T_out:${salidastotal}`)
            console.log("-------------------------------")


            horaactual = getFechaCompleta()
            //Save in LOCAL

            if(param1.eventoIO)
                aux1 = "Entrada"
            else
                aux1 = "Salida"
            insertInto.run(horaactual,"Right",aux1,entradasder,entradasizq,entradastotal,salidasder,salidasizq,salidastotal)

            //Send MQTT
            param1.timestamp = horaactual
            param1.sensor = "Right"
            param1.entradasSensorDer = entradasder
            param1.entradasSensorIzq = entradasizq
            param1.entradasTotal = entradastotal
            param1.salidasSensorDer = salidasder
            param1.salidasSensorIzq = salidasizq
            param1.salidasTotal = salidastotal
            param1.estPersonas = entradastotal - salidastotal
            param1.date = isodate();
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
            aux2 = parseInt(subchain2[16]+subchain2[17]+subchain2[18]+subchain2[19],16)

            if(aux2 > entradasizq)
                param2.eventoIO = true
            

            entradasizq = aux2

            aux2 = parseInt(subchain2[20]+subchain2[21]+subchain2[22]+subchain2[23],16)

            if(aux2 > salidasizq)
                param2.eventoIO = false

            salidasizq = aux2

            entradastotal = entradasder + entradasizq;
            salidastotal = salidasder + salidasizq;

            console.log(`I- In:${entradasizq} Out:${salidasizq}`)
            console.log(`I- T_in:${entradastotal} T_out:${salidastotal}`)
            console.log("-------------------------------")

            horaactual = getFechaCompleta()
            //Save in LOCAL
            if(param2.eventoIO)
                aux2 = "Entrada"
            else
                aux2 = "Salida"
            insertInto.run(horaactual,"Left",aux2,entradasder,entradasizq,entradastotal,salidasder,salidasizq,salidastotal)

            //Send MQTT
            param2.timestamp = horaactual
            param2.sensor = "Left"
            param2.entradasSensorDer = entradasder
            param2.entradasSensorIzq = entradasizq
            param2.entradasTotal = entradastotal
            param2.salidasSensorDer = salidasder
            param2.salidasSensorIzq = salidasizq
            param2.salidasTotal = salidastotal
            param2.estPersonas = entradastotal - salidastotal
            param2.date = isodate();
            client.publish("CRAIUPCTPersonCount",JSON.stringify(param2))
        }

    }
})

