var _  = require('lodash');
// var DeviceType = require('./configs/DeviceType.js');
// var connectDeviceConfig = require('./configs/connect.conf.json');

var deviceHandler = require('../updated.js');

// var connect = new DeviceType(connectDeviceConfig);

function SanityCheck() {

}

SanityCheck.prototype.validateHeaders = function(inputHeaders, deviceName) {
  // console.log("Processing Header line",s line);
  // validate the header values with the given rules for that device
  // split with delimeter ','
  // headers = line.split(COMMA);
  // console.log("HEADER VALUES:", headers);

  let missingHeaders = deviceHandler.checkMissingColumns(inputHeaders);
  this.headers = inputHeaders;
  return missingHeaders;
  // if false => abort()
  // true => dont do anything

}


SanityCheck.prototype.validateCriteria = function(values) {
  let headersWithValues = {};
  for(let i=0;i<values.length;i++) {
    let header = this.headers[i];
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
      // console.log("checkForCriteria failed for ", header);
      return [];
    }
  }

  return headersWithValues;
}

module.exports = SanityCheck;
