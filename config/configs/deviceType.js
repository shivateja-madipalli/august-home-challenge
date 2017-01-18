//var checkISO = require('regex-iso-date');
var _  = require('lodash');

function DeviceType(headerSchema){
  if(typeof headerSchema === 'object'){
    this.headers=headerSchema;
  }
  // console.log("headerSchema", this.headers);
}

DeviceType.prototype.getHeadersInOrder = function(inputHeaders){
  let resultHeaders = [];

  inputHeaders.forEach((header)=>{
    resultHeaders.push(_.find(this.headers,{"headerName" : header}));
  });

  return resultHeaders;
}

DeviceType.prototype.printHeaders = function(){
  console.log(this.headers);
}

//Check missing columns and return an array of Missing columns
DeviceType.prototype.checkMissingColumns = function (inputHeaders) {
  let missingHeaders = _.cloneDeep(this.headers);

  inputHeaders.forEach((inputHeader)=>{
    _.remove(missingHeaders, (header)=>{
       return header.headerName === inputHeader;
    });
  });

  return missingHeaders;
};

DeviceType.prototype.checkCriteria = function (headerName,value) {
  let header = _.find(this.headers,{"headerName":headerName});
  if(header.ignore) {
    return true;
  }
  if(typeof header.criteria !== 'undefined' && value !== null)  {

    return value.match(header.criteria) !== null;
  }
  return false;

};

DeviceType.prototype.checkType = function (headerName,value){
  return typeof value ===  _.find(this.headers,{"headerName":headerName}).type;
}

DeviceType.prototype.getDBName = function(headerName){
  return _.find(this.headers,{"headerName":headerName}).dbName;
}

DeviceType.prototype.isRequired = function(headerName){
  return _.find(this.headers,{"headerName":headerName}).ignore;
}

module.exports = DeviceType;
