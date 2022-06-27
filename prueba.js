const { SerialPort } = require('serialport')
const Database = require("better-sqlite3");
const mqtt = require("mqtt")
var CronJob = require('cron').CronJob;

/* CRON */

let msg = Buffer.from([0x00,0x55,0x08,0x00,0x00,0x00,0x00,0x7c])

var job = new CronJob(
	'00 00 07 * * *',
	function() {
		console.log('Good morning! Restarting both sensors');
        total = 0
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
clientId: 'raspCRAI',
username: 'raspCRAI',
password: 'raspCRAI2022',
}

// Connect string, and specify the connection method by the protocol
// ws Unencrypted WebSocket connection
// wss Encrypted WebSocket connection
// mqtt Unencrypted TCP connection
// mqtts Encrypted TCP connection
// wxs WeChat applet connection
// alis Alipay applet connection
const connectUrl = 'ws://10.147.18.134:8083/mqtt'
const client = mqtt.connect(connectUrl, options)

client.on('connect', function () {
        console.log("Connected to MQTT URL")
  })

/*SQLITE3 - Local storagement*/
const db = new Database("PersonCount.db")
const createTable = 
    "CREATE TABLE IF NOT EXISTS PersonCounter ('Timestamp','IdSensor','CuentaActualSensor','CuentaGlobal')";
db.exec(createTable);

const insertInto = db.prepare(
    "INSERT INTO PersonCounter (Timestamp,IdSensor,CuentaActualSensor,CuentaGlobal) VALUES (?,?,?,?)"
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


const serialport1 = new SerialPort({
    path : '/dev/ttyACM0',
    baudRate: 115200,
    parity:'none',
    stopBits:1,
    dataBits:8,
    flowControl:false 
})

const serialport2 = new SerialPort({
    path : '/dev/ttyUSB0',
    baudRate: 115200,
    parity:'none',
    stopBits:1,
    dataBits:8,
    flowControl:false 
})
var total = 0

let horaactual = getFechaCompleta()
let chain1 = ''
let subchain1 = ''
let countchain1 = ''
let cuenta1 = 0
let param1 = {}

let chain2 = ''
let subchain2 = ''
let countchain2 = ''
let cuenta2 = 0
let param2 = {}

console.log("DEMO CONTADOR PERSONAS BIBLIOTECA ANTIGONES")

let cfg = Buffer.from([0x00,0x61,0x01,0xe7])
serialport1.write(cfg)
serialport2.write(cfg)

serialport1.on('data',function(buff){
    
    //console.log(buff.toString('hex'))
    //chain += buff.toString('hex')
    chain1 = buff.toString('hex') //va de uno a uno
	    if(chain1.includes('4250')){
		console.log("contador 1")
		console.log(chain1)
	}


    if(chain1.includes('5043')){

        subchain1 = chain1.split('5043')
	console.log("ID:")
	console.log(chain1)

        if(subchain1[1].length>=16){
            
            countchain1 = subchain1[1][8]+subchain1[1][9]+subchain1[1][10]+subchain1[1][11]+subchain1[1][12]+subchain1[1][13]+subchain1[1][14]+subchain1[1][15]

            cuenta1 = parseInt(countchain1,16)

            horaactual = getFechaCompleta()
            total = cuenta1+cuenta2
            console.log(`R-${cuenta1} Total ${total} - ${horaactual}`)
            insertInto.run(horaactual,"Right",cuenta1,total)
            console.log("------------------------------------------------------------------------------")
            param1.Time = horaactual
            param1.Sensor = "Right"
            param1.SensorCount = cuenta1
            param1.Total = total
            client.publish("CRAIUPCTPersonCount",JSON.stringify(param1))

        }
    }
        
    
    
});

serialport2.on('data',function(buff){
    
    
    //console.log(buff.toString('hex'))
    //chain += buff.toString('hex')
    chain2 = buff.toString('hex') //va de uno a uno
    if(chain1.includes('4250')){
		console.log("contador 2")
		console.log(chain1)
	}
    
    if(chain2.includes('5043')){
        //console.log("Cadena Original",chain2)
        subchain2 = chain2.split('5043')
	console.log("ID:")
	console.log(chain1)
        
        if(subchain2[1].length>=16){
            countchain2 = subchain2[1][8]+subchain2[1][9]+subchain2[1][10]+subchain2[1][11]+subchain2[1][12]+subchain2[1][13]+subchain2[1][14]+subchain2[1][15]
    
            cuenta2 = parseInt(countchain2,16)
    
            horaactual = getFechaCompleta()
            total = cuenta1+cuenta2
            console.log(`L-${cuenta2} Total: ${total} - ${horaactual}`)
            insertInto.run(horaactual,"Left",cuenta2,total)
            console.log("------------------------------------------------------------------------------")
            param2.Time = horaactual
            param2.Sensor = "Left"
            param2.SensorCount = cuenta2
            param2.Total = total
            client.publish("CRAIUPCTPersonCount",JSON.stringify(param2))
            
        }
       
    
    }
        
});
