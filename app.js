const { SerialPort } = require('serialport')
const Database = require("better-sqlite3");
const mqtt = require("mqtt")

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
const connectUrl = 'ws://localhost:8083/mqtt'
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

serialport1.on('data',function(buff){
    
    
    //console.log(buff.toString('hex'))
    //chain += buff.toString('hex')
    chain1 = buff.toString('hex') //va de uno a uno

    if(chain1.includes('5043')){

        if(subchain2[1].length>=16){

            subchain1 = chain1.split('5043')
            
            countchain1 = subchain1[1][8]+subchain1[1][9]+subchain1[1][10]+subchain1[1][11]+subchain1[1][12]+subchain1[1][13]+subchain1[1][14]+subchain1[1][15]

            cuenta1 = parseInt(countchain1,16)

            horaactual = getFechaCompleta()
            total = cuenta1+cuenta2
            console.log(`Total de personas en la Biblioteca: ${total} - ${horaactual}`)
            insertInto.run(horaactual,"Left",cuenta1,total)
            console.log("------------------------------------------------------------------------------")
            param1.Time = horaactual
            param1.Sensor = "Left"
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

    if(chain2.includes('5043')){
        //console.log("Cadena Original",chain2)
        subchain2 = chain2.split('5043')
        
        if(subchain2[1].length>=16){
            countchain2 = subchain2[1][8]+subchain2[1][9]+subchain2[1][10]+subchain2[1][11]+subchain2[1][12]+subchain2[1][13]+subchain2[1][14]+subchain2[1][15]
    
            cuenta2 = parseInt(countchain2,16)
    
            horaactual = getFechaCompleta()
            total = cuenta1+cuenta2
            console.log(`Total de personas en la Biblioteca: ${total} - ${horaactual}`)
            insertInto.run(horaactual,"Right",cuenta2,total)
            console.log("------------------------------------------------------------------------------")
            param2.Time = horaactual
            param2.Sensor = "Left"
            param2.SensorCount = cuenta2
            param2.Total = total
            client.publish("CRAIUPCTPersonCount",JSON.stringify(param2))
            
        }
       
    
    }
        
});

client.on('message', function (topic, message) {
    // message is Buffer
    console.log(message.toString())
    client.end()
  })