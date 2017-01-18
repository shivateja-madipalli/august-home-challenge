// var csv = require("csv");
var LineByLineReader = require('line-by-line');
var MongoClient = require('mongodb').MongoClient;
var Promise = require('promise');
var _ = require('lodash');

var DeviceType = require('./config/configs/DeviceType.js');

var SanityCheck = require('./config/sanityCheck.js');

var connectDeviceConfig = require('./config/configs/connect.conf.json');

// var doorbell = require('doorbell');

var args = process.argv;

// CONST VARIABLES
const COMMA = ',';
let headers = [];
var database;

let DEVICE_NAME = args[2];
let FILE_LOCATION = args[3];

// go get the required config file according to the device name (DEVICE_NAME)

var connect = new DeviceType(connectDeviceConfig);

var sanitycheck = new SanityCheck();

// console.log("Device Name:", DEVICE_NAME);
// console.log("File Location:", FILE_LOCATION);

let abort = (reason) => {
  console.log("THE REASON: ", reason);
  process.exit();
}

let getdbURL = (dbName) => {
  return 'mongodb://localhost/' + dbName;
}

let insertDocument = (data, collection) => {
  return new Promise(function(resolve, reject) {
    collection.insertOne( data, function(err, result) {
     // console.log("Inserted a document into the collection.");
     if(err) {
       resolve(false);
     }
     resolve(true);
   });
  });
};

let getSerialNumber = (data, collection) => {
  return new Promise(function(resolve, reject) {
    // console.log("DATA in getSerialNumber", data);
    collection.find(data).toArray(function(err, res) {
      if(err) {
        // console.log("ERROR:", err);
      }
      // console.log("Found the SERIAL NUMBER");
      // console.log(res);
      resolve(res);
    });
  });
}

let connectToMongoDB = (url) => {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      let collectionName = "default";
      var collection = db.collection(collectionName);
      database = db;
      resolve(collection, db);
    });
  });
}

let insertSerialNumber = (dbName, serialNumber) => {
  // inserting value into Serial Number DB
  // we already know the serial number db
  // all we need is accept the value and insert

  // insert value into the db
  return new Promise((resolve, reject) => {
    let url = getdbURL(dbName);
    let coll;
    let actualData;
    connectToMongoDB(url).then((collection, db) => {
      let data = {};
      coll = collection;
      data["serialNumber"] = serialNumber;
      actualData = data;
      return getSerialNumber(data, collection);

    }).then((existingData) => {
      // // console.log("getSerialNumber got RESOLVED");
      if(existingData.length > 0) {
        // console.log("existingData is NOT EMPTY");
        return false;
      }
      else {
        // console.log("existingData is EMPTY");
        return insertDocument(actualData, coll);
      }
    }).then((resultFromInsertion) => {
      // // console.log("insertDocument GOT RESOLVED", resultFromInsertion);
      // // console.log("DB IS GOING TO BE CLOSED");
      database.close();
      resolve(resultFromInsertion);
    }).catch((err) => {
    // console.log("ERROR IN PROMISE:", err);
    });
  });
}

let insertIntoDB = (dbName, key, value) => {
  // // console.log("insertIntoDB GOT CALLED");
  // // console.log("dbName: ", dbName);
  // // console.log("key: ", key);
  // // console.log("value: ", value);
  // // console.log("##################");
  return new Promise((resolve, reject) => {
    let url = getdbURL(dbName);
    // console.log("URL IN insertIntoDB: ", url);
    connectToMongoDB(url).then((collection, db) => {
      let data = {};
      data[key] = value;
      // console.log("data IN insertIntoDB: ", data);

      return insertDocument(data, collection);

    }).then((resultFromInsertion) => {
      // // console.log("insertDocument GOT RESOLVED", resultFromInsertion);
      // // console.log("DB IS GOING TO BE CLOSED");
      database.close();
      resolve(resultFromInsertion);

    }).catch((err) => {
      // console.log("ERROR IN PROMISE insertIntoDB:", err);

    });
  });
}

let processLine = (line) => {
  // // console.log("Processing Line by Line", line);

  // we can get the order in which we have to save the values from the
  // global header array

  // what ever might be the sequence insert the serial number first
  // insert serial number

  // loop through values in the line

  let values = line.split(',');
  let headersWithValues = [];

  let shouldInsert = false;
  for(let i=0;i<values.length;i++) {
    let header = headers[i];
    let ele;
    if(values[i]) {
      ele = values[i];
      ele = ele.trim();
    }
    else {
      ele = null;
    }
    var checkForCriteria = connect.checkCriteria(header,ele);
    if(checkForCriteria) {
      // get DB Name from
      shouldInsert = true;
      headersWithValues[header] = ele;
    }
    else {
      // console.log("checkForCriteria failed for ", header);
      shouldInsert = false;
      break;
    }
  }

  let promiseAry = [];
  if(shouldInsert) {
    // get serialNumber
    let serialNumberValue = headersWithValues["serialNumber"];
    let dbNameValue = connect.getDBName("serialNumber");
    insertSerialNumber(dbNameValue, serialNumberValue).then((resultFromSerialNumber) => {
      // console.log("Serial Number got inserted?", resultFromSerialNumber);
      if(resultFromSerialNumber) {
        // console.log("headersWithValues", headersWithValues);
        for(var key in headersWithValues) {
          let value = headersWithValues[key];
          let dbName = connect.getDBName(key);
          if(key != "serialNumber" && typeof dbName !== 'undefined') {
            promiseAry.push(insertIntoDB(dbName, serialNumberValue, value));
          }
        }

        // console.log("promiseAry", promiseAry);

        return Promise.all(promiseAry);
      }
      else {
        // abort();
        // serial number already exists
      }
    }).then(values => {
      if(values) {
        // console.log("FINAL RESULT", values);
        return true;
      }
      else {
        // // console.log("Data already exists");
        return false;
      }
      // abort();
      // stop exec
    }).catch((err) => {
      // console.log("ERROR IN PROMISE ALL CALL:", err);
    });
  }
  else {
    // abort();
  }
  return true;
  // once serial number is inserted then insert all other values
}

let readFile = (fileLocation) => {
  var lr = new LineByLineReader(fileLocation);

  lr.on('error', function (err) {
  	// 'err' contains error object
    abort('File have error with lines' + err);
  });

  let lineCount = 0;

  lr.on('line', function (line) {
    // 'line' contains the current line without the trailing newline character.
    // // console.log("Reading Line by Line", line);
    if(lineCount == 0) {
      // check if required headers are present for given device
      // validateHeaders(line, DEVICE_NAME);
      if(!sanitycheck.validateHeaders(line.split(COMMA), DEVICE_NAME)){
        abort('oops! the "required" Headers are missing');
      }
      lineCount++;
      // if not return error
    }
    else {
      let output = processLine(line);
      console.log("DID THE LINE GOT PROCESSED WITHOUT ERRORS?", output);
    }
  });

  lr.on('end', function () {
  	// All lines are read, file is closed now.
    abort('Hurray! All lines are read, file is closed now');
  });
}

if(FILE_LOCATION) {
  readFile(FILE_LOCATION);
}
else {
  // console.log("Please provide device name and file location");
  abort('Please provide "Device Name" and "File Location"');
}
