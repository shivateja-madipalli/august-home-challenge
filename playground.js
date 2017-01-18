var LineByLineReader = require('line-by-line');
var MongoClient = require('mongodb').MongoClient;
var Promise = require('promise');
var _ = require('lodash');

var arguments = process.argv;

let FILE_LOCATION = arguments[2];

var db;

let callAPromise = (line, collectionName) => {
  return new Promise(function(resolve, reject) {
    // insert data into mongodb
    var collect = db.collection(collectionName);
    var data = {
      "input" : line
    }
    collect.insertOne(data, function(err, result) {
      if(err) {
        console.log("ERROR IN INSERTING DATA", err);
        reject(err);
      }
      resolve(true);
    });
  });
}

let testCall = (param1, collName) => {
  callAPromise(param1, collName).then((result)=> {
    console.log("RESULT:", result);
  }).catch((err) => {
    console.log("ERROR IN calling callAPromise PROMISE:", err);
  });
}

let testReader = (fileLocation) => {
  var lr = new LineByLineReader(fileLocation);

  lr.on('error', function (err) {

  });

  lineCount = 0;
  var promiseArray = [];
  var count = 0;

  lr.on('line', function (line) {
    count++;
    var collName = "qwerty"+count;
    testCall(line, collName);
  });

  lr.on('end', function () {
  });
}

let openMongoConnection = () => {
  let url = "mongodb://localhost/testingDB";
  MongoClient.connect(url, function(err, database) {
  if(err) throw err;

  db = database;
  console.log("mongo connection is open");
});
}

openMongoConnection();

if(FILE_LOCATION) {
  testReader(FILE_LOCATION);
}
else {
}
