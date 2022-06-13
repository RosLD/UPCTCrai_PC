const { count } = require('console');
const { Interface } = require('readline');
const { SerialPort, ReadlineParser,ByteLengthParser } = require('serialport')
const Database = require("better-sqlite3");

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

let chain1 = ''
let subchain1 = ''
let countchain1 = ''
let cuenta1 = 0

let chain2 = ''
let subchain2 = ''
let countchain2 = ''
let cuenta2 = 0

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

            total = cuenta1+cuenta2
            console.log("Total personas dentro: ",total)
            insertInto.run(getFechaCompleta(),"Left",cuenta1,total)
            console.log("------------------------------------------------------------------------------")

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
    
            total = cuenta1+cuenta2
            console.log("Total personas dentro: ",total)
            insertInto.run(getFechaCompleta(),"Right",cuenta2,total)
            console.log("------------------------------------------------------------------------------")
            
        }
       
    
    }
        
});
