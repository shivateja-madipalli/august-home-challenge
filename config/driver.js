var DeviceType = require('./configs/DeviceType.js');

var connectDeviceConfig = require('./configs/connect.conf.json');

//New connect Device
var connect = new DeviceType(connectDeviceConfig);
//
// console.log("DevicesinOrder");
// console.log(connect.getHeadersInOrder(['macAddressWiFi','shipDate']));
//
// console.log("missing Columns");
// console.log(connect.checkMissingColumns(['macAddressWiFi','shipDate']));

console.log("check Criteria");
// console.log(connect.checkCriteria('macAddressWiFi',':5e:60:e7:96:fb'));
console.log(connect.checkCriteria('BLPassword','asasas'));

// console.log("get DBName");
// console.log(connect.getDBName('macAddressWiFi'));
//
// console.log("DevicesinOrder");
// console.log(connect.getHeadersInOrder(['macAddressWiFi','shipDate']));
