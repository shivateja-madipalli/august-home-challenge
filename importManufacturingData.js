// var csv = require("csv");
var LineByLineReader = require('line-by-line');
var MongoClient = require('mongodb').MongoClient;
var Promise = require('promise');
var _ = require('lodash');
var logSymbols = require('log-symbols');


var DeviceType = require('./config/configs/DeviceType.js');
var GetDeviceConfig = require('./config/GetDeviceConfig');

var args = process.argv;

// CONST VARIABLES
const COMMA = ',';
const SERIAL_NUMBER = 'serialNumber';
const COLLECTION_NAME = 'default';
const MONGO_SERVER = 'localhost';
const MONGO_DATABASE = 'augustHomeDB';

var globalDatabase;
let headers = [];
let lineCount = 0;
let headersWithValues = {};
var database;

let DEVICE_NAME = args[2];
let FILE_LOCATION = args[3];

console.log("Device Name:", DEVICE_NAME);
console.log("File Location:", FILE_LOCATION);

let abortMessage = {};
let failure = 0;
let success = 0;

let createAbortMessage = (message, lineNumber, status, serialNumber) => {
  let data = {
    message: message,
    lineNumber: lineNumber,
    status: status,
    serial_number: serialNumber
  }
  if(!status) {
    failure++;
  }
  else {
    success++;
  }
  abortMessage[lineNumber] = data;
}

let abort = (reason) => {
  console.log(reason);
  process.exit(0);
}

// Get the required config file according to the device name (DEVICE_NAME)
var getDeviceConfig = new GetDeviceConfig(DEVICE_NAME);
var deviceConfig = getDeviceConfig.getConfig();

if(typeof deviceConfig !== 'undefined') {
  var deviceHandler = new DeviceType(deviceConfig);
  // console.log("deviceHandler: ", deviceHandler);
}
else {
  // console.log("Please provide device name and file location");
  abort('Please provide "Device Name" and "File Location" correct');
}

let createCollection = (collectionName) => {
  let collect = globalDatabase.collection(collectionName);
  return collect;
}

let insertDocument = (data, collection) => {
  return new Promise(function(resolve, reject) {
    collection.insertOne(data, function(err, result) {
      if(err) {
        console.log("ERROR IN INSERTING DATA INTO MONGO DB PLESE CHECK WITH ADMIN", err);
        reject(err);
      }
      // console.log("AFTER INSERTING DOCUMENT", result);
      resolve(true);
    });
  }).catch((err) => {
    console.log("ERROR IN insertDocument PROMISE:", err);
  });
};

let getSerialNumber = (data, collection) => {
  return new Promise(function(resolve, reject) {
    // console.log("DATA in getSerialNumber", data);
    collection.find(data).toArray(function(err, res) {
      if(err) {
        console.log("ERROR IN RETRIEVING DATA FROM MONGO DB PLESE CHECK WITH ADMIN", err);
        reject(err);
      }
      // console.log("Found the SERIAL NUMBER");
      resolve(res);
    });
  }).catch((err) => {
    console.log("ERROR IN getSerialNumber PROMISE:", err);
  });
}

let insertSerialNumber = (dbName, serialNumber) => {
  return new Promise((resolve, reject) => {

    let globalData = {};
    globalData[SERIAL_NUMBER] = serialNumber;
    let serialNumberCollection = createCollection(dbName);

    getSerialNumber(globalData, serialNumberCollection).then((existingData) => {
      if(existingData.length > 0) {
        return false;
      }
      else {
        return insertDocument(globalData, serialNumberCollection);
      }
    }).then((resultFromInsertion) => {
      resolve(resultFromInsertion);
    }).catch((err) => {
      console.log("ERROR IN insertSerialNumber PROMISE:", err);
    });
  });
}

let insertDetail = (collectionName, key, value) => {
  return new Promise((resolve, reject) => {
    let data = {};
    data[key] = value;
    // change collection
    var collection = globalDatabase.collection(collectionName);
    insertDocument(data, collection).then((resultFromInsertion) => {
      resolve(resultFromInsertion);

    }).catch((err) => {
      console.log("ERROR IN insertDetail PROMISE:", err);
    });
  });

}

// SANITY CHECKS - START

let validateHeaders =(inputHeaders, deviceName) => {
  let missingHeaders = deviceHandler.checkMissingColumns(inputHeaders);
  // console.log("MISSING HEADERS: ", missingHeaders);
  this.allheaders = inputHeaders;
  return missingHeaders;
}

let validateCriteria = (values) => {
  // let headersWithValues = {};
  let failedValues = [];
  for(let i=0;i<values.length;i++) {
    let header = this.allheaders[i];
    let ele;
    if(values[i]) {
      ele = values[i];
      ele = ele.trim();
    }
    else {
      ele = null;
    }
    header = header.trim();
    if(header) {
      var checkForCriteria = deviceHandler.checkCriteria(header, ele);
      if(checkForCriteria) {
        // get DB Name from
        headersWithValues[header] = ele;
      }
      else {
        failedValues.push(header);
      }
    }
  }
  return failedValues;
}

// SANITY CHECKS - END

let processLine = (line, lineNumber) => {
  return new Promise(function(resolve, reject) {
    let values = line.split(',');
    let failedHeaders = validateCriteria(values);
    let promiseAry = [];

    if(failedHeaders.length == 0) {
      let serialNum = headersWithValues[SERIAL_NUMBER];
      let collectionName = deviceHandler.getDBName(SERIAL_NUMBER);

      insertSerialNumber(collectionName, serialNum).then((resultAfterInsertSerialNumber) => {
        // console.log("Serial Number got inserted?", resultAfterInsertSerialNumber);
        if(resultAfterInsertSerialNumber) {
          for(var key in headersWithValues) {
            let value = headersWithValues[key];
            let collName = deviceHandler.getDBName(key);
            if(key != "serialNumber" && typeof collName !== 'undefined') {
              promiseAry.push(insertDetail(collName, serialNum, value));
            }
          }
          return Promise.all(promiseAry);
        }
        else {
          createAbortMessage("Serial Number Already exists", lineNumber, false, serialNum);
        }
      }).then((values) => {
        if(values && (values.indexOf(false) === -1)) {
          abortMessage[lineNumber] = "Data in this line inserted successfully :)";
          createAbortMessage("Data in this line inserted successfully :)", lineNumber, true, serialNum);
        }
        resolve(true);

      }).catch((err) => {
        console.log("ERROR IN (insertSerialNumber || promise.all) PROMISE:", err);
      });
    }
    else {
      let message = "values does not match the criteria and the failed headers are: " + JSON.stringify(failedHeaders);
      createAbortMessage(message, lineNumber, false, '');
      resolve(false);
    }
    // return lineNumber;
    // once serial number is inserted then insert all other values

  }).catch((err) => {
    console.log("ERROR IN processLine Promise", err);
  });
}

let readFile = (fileLocation) => {
  var lr = new LineByLineReader(fileLocation);
  lr.on('error', function (err) {
    abort(err);
  });

  lineCount = 0;
  var promiseArr = [];

  lr.on('line', function (line) {
    if(lineCount == 0) {
      let missingResult = validateHeaders(line.split(COMMA), DEVICE_NAME);
      let missingHeaders = [];
      if(missingResult) {
        for(var ele in missingResult) {
          if(!ele.ignore) {
            missingHeaders.push(missingResult[ele].headerName);
          }
        }
      }
      if(missingHeaders.length > 0) {
        abort('The "required" Headers are missing: ' + JSON.stringify(missingHeaders));
      }
      lineCount++;
    }
    else {
      lineCount++;
      promiseArr.push(processLine(line, lineCount));
    }
  });

  lr.on('end', function () {
    Promise.all(promiseArr).then((result) => {
      let finalOutput = '';
      finalOutput += "\n";
      finalOutput += "SUCCESS: " + "\t" + success;
      finalOutput += "\n";
      finalOutput += "****";
      finalOutput += "\n";
      finalOutput += "FAILURE: " + "\t" + failure;
      finalOutput += "\n";
      finalOutput += "#####################";
      finalOutput += "\n";
      _.forEach(abortMessage, function(value, key) {
        finalOutput += "Line Number: ";
        finalOutput += value['lineNumber'];
        finalOutput += "\n";
        finalOutput += "Status: ";
        finalOutput += value['status'];
        finalOutput += "\n";
        finalOutput += "Message: ";
        finalOutput += value['message'];
        finalOutput += "\n";
        finalOutput += "Serial Number: ";
        finalOutput += value['serial_number'];
        finalOutput += "\n";
        finalOutput += "#####################";
        finalOutput += "\n";
      });

      finalOutput += "**********************";
      finalOutput += "\n";
      finalOutput += logSymbols.success + " Shivateja (Shiv) Madipalli";
      finalOutput += "\n";
      finalOutput += logSymbols.info + " https://shivatejam.com";
      finalOutput += "\n";
      finalOutput += "**********************";
      abort(finalOutput);

      // let abortMsg = JSON.stringify(abortMessage, null, "\t");
      // console.log(abortMsg);
      // abortMsg = abortMsg + "\t" + "success: " + sucess;
      // abortMsg = abortMsg + "\t" + "failure: " + failure;

      abort(abortMsg);
    });
  });
}

let openMongoConnection = () => {
  let url = "mongodb://"+MONGO_SERVER+"/"+MONGO_DATABASE;
  MongoClient.connect(url, function(err, database) {
    if(err) throw err;

    globalDatabase = database;
    console.log("mongo connection is open");
  });
}

openMongoConnection();
if(FILE_LOCATION) {
  readFile(FILE_LOCATION);
}
else {
  abort('Please provide "Device Name" and "File Location" correct');
}

exports.deviceHandler = deviceHandler;
