// var csv = require("csv");
var LineByLineReader = require('line-by-line');
var MongoClient = require('mongodb').MongoClient;
var Promise = require('promise');
var _ = require('lodash');

var DeviceType = require('./config/configs/DeviceType.js');
var GetDeviceConfig = require('./config/GetDeviceConfig');

var args = process.argv;

// CONST VARIABLES
const COMMA = ',';
const SERIAL_NUMBER = 'serialNumber';
const COLLECTION_NAME = 'default';
const MONGO_SERVER = 'localhost';

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

let abort = (reason) => {
  console.log("REASON:", reason);
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

let getdbURL = (dbName) => {
  return 'mongodb://'+MONGO_SERVER+'/' + dbName;
}

let insertDocument = (data, collection) => {
  return new Promise(function(resolve, reject) {
    collection.insertOne( data, function(err, result) {
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

let connectToMongoDB = (url) => {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      if(err) {
        console.log("ERROR IN CONNECTING TO MONGO DB PLESE CHECK WITH ADMIN", err);
        reject(err);
      }
      let collectionName = COLLECTION_NAME;
      var collection = db.collection(collectionName);
      globalDatabase = db;
      resolve(collection);
    });
  }).catch((err) => {
    console.log("ERROR IN connectToMongoDB PROMISE:", err);
  });
}

let insertSerialNumber = (dbName, serialNumber) => {
  return new Promise((resolve, reject) => {
    let url = getdbURL(dbName);
    let globalCollection;
    let globalData;
    connectToMongoDB(url).then((collection) => {
      let data = {};
      data[SERIAL_NUMBER] = serialNumber;
      globalData = data;
      globalCollection = collection;
      return getSerialNumber(data, collection);

    }).then((existingData) => {
      if(existingData.length > 0) {
        return false;
      }
      else {
        console.log("existingData is EMPTY");
        return insertDocument(globalData, globalCollection);
      }
    }).then((resultFromInsertion) => {
      globalDatabase.close();
      resolve(resultFromInsertion);
    }).catch((err) => {
      console.log("ERROR IN insertSerialNumber PROMISE:", err);
    });
  });
}

let insertDetail = (dbName, key, value) => {

  // return new Promise((resolve, reject) => {
  //   let url = getdbURL(dbName);
  //   connectToMongoDB(url).then((collection, db) => {
  //     let data = {};
  //     data[key] = value;
  //     return insertDocument(data, collection);
  //
  //   }).then((resultFromInsertion) => {
  //     globalDatabase.close();
  //     resolve(resultFromInsertion);
  //
  //   }).catch((err) => {
  //     console.log("ERROR IN insertDetail PROMISE:", err);
  //   });
  // });

  return new Promise((resolve, reject) => {
    let data = {};
    data[key] = value;
    // change collection
    var collection = globalDatabase.collection("Random_shit_name");
    insertDocument(data, collection).then((resultFromInsertion) => {
      // globalDatabase.close();
      resolve(resultFromInsertion);

    }).catch((err) => {
      console.log("ERROR IN insertDetail PROMISE:", err);
    });
  });

}

// SANITY CHECKS - START

let validateHeaders =(inputHeaders, deviceName) => {
  let missingHeaders = deviceHandler.checkMissingColumns(inputHeaders);
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
    var checkForCriteria = deviceHandler.checkCriteria(header, ele);
    if(checkForCriteria) {
      // get DB Name from
      headersWithValues[header] = ele;
    }
    else {
      failedValues.push(header);
    }
  }
  return failedValues;
}

// SANITY CHECKS - END

let processLine = (line, lineNumber) => {
  // console.log("Processing Line by Line", line);

  // we can get the order in which we have to save the values from the
  // global header array

  // what ever might be the sequence insert the serial number first
  // insert serial number

  // loop through values in the line

  let values = line.split(',');
  let failedHeaders = validateCriteria(values);

  let promiseAry = [];

  if(failedHeaders.length == 0) {
    // console.log("VALIDATION OF CRITERIA SUCCESSFUL:", headersWithValues);
    // get serialNumber
    let serialNum = headersWithValues[SERIAL_NUMBER];
    let databaseName = deviceHandler.getDBName(SERIAL_NUMBER);

    insertSerialNumber(databaseName, serialNum).then((resultAfterInsertSerialNumber) => {
      // console.log("Serial Number got inserted?", resultAfterInsertSerialNumber);
      if(resultAfterInsertSerialNumber) {
        // console.log("headersWithValues", headersWithValues);
        for(var key in headersWithValues) {
          let value = headersWithValues[key];
          let dbName = deviceHandler.getDBName(key);
          if(key != "serialNumber" && typeof dbName !== 'undefined') {
            promiseAry.push(insertDetail(dbName, serialNum, value));
          }
        }
        return Promise.all(promiseAry);
      }
      else {
        if(typeof abortMessage[lineNumber] !== 'undefined') {
          abortMessage[lineNumber] = abortMessage[lineNumber] + " ## " + "Line Serial Number Already exists";
          console.log(abortMessage[lineNumber] + "for line: " + lineNumber);
        }
        else {
          abortMessage[lineNumber] = "Line Serial Number Already exists";
          console.log(abortMessage[lineNumber] + "for line: " + lineNumber);
        }
      }
    }).then(values => {
      if(values && (values.indexOf(false) === -1)) {
        if(typeof abortMessage[lineNumber] !== 'undefined') {
          abortMessage[lineNumber] = abortMessage[lineNumber] + " ## " + "New Data Inserted :)";
          console.log(abortMessage[lineNumber] + "for line: " + lineNumber);
        }
        else {
          abortMessage[lineNumber] = "New Data Inserted :)";
          console.log(abortMessage[lineNumber] + "for line: " + lineNumber);
        }
        return lineNumber;
      }
      else {
        return lineNumber;
      }
    }).catch((err) => {
      console.log("ERROR IN (insertSerialNumber || promise.all) PROMISE:", err);
    });
  }
  else {
    abortMessage[lineNumber] = "values does not match the criteria";
    console.log(abortMessage[lineNumber] + " for line: " + lineNumber + " and the failed headers: " + failedHeaders);
  }
  // return lineNumber;
  // once serial number is inserted then insert all other values
}


let readFile = (fileLocation) => {
  var lr = new LineByLineReader(fileLocation);

  lr.on('error', function (err) {

  });

  lineCount = 0;
  var promiseArray = [];

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
      if(missingHeaders.length > 0){
        abort('The "required" Headers are missing: ' + JSON.stringify(missingHeaders));
      }
      lineCount++;
      // if not return error
    }
    else {
      lineCount++;
      processLine(line, lineCount)
      // console.log("DID THE LINE GOT PROCESSED WITHOUT ERRORS?", output);
    }
  });

  lr.on('end', function () {

  });
}

if(FILE_LOCATION) {
  readFile(FILE_LOCATION);
}
else {
  console.log("Please provide device name and file location");
  abort('Please provide "Device Name" and "File Location" correct');
}

exports.deviceHandler = deviceHandler;
