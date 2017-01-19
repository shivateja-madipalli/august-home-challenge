var connectConfig = require('./configs/connect.conf.json');
var doorbellConfig = require('./configs/doorbell.conf.json');

function GetDeviceConfig(deviceName) {
  this.deviceName = deviceName;
}

GetDeviceConfig.prototype.getConfig = function() {
  // if(this.deviceName === "Connect") {
  //   return connectConfig;
  // }
  console.log("DEVICE NAME: ", this.deviceName);
  switch(this.deviceName) {
    case "connect":
      return connectConfig;

    case "doorbell":
      return doorbellConfig;

    default:
      return null;

  }
}

module.exports = GetDeviceConfig;
