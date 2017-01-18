//var checkISO = require('regex-iso-date');
var _  = require('lodash');
// var checkISO = require('regex-iso-date');
// var moment = require('moment');
var semverRegex = require('semver-regex');

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
    missingHeaders = _.remove(missingHeaders, (header)=>{
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
    // var regex = new RegExp(header.criteria);
    // console.log(regex.test(value));
    if(header.type === "date") {
      // value = value.replace('/','-');
      let dateArry = value.split("/");
      value = dateArry[2]+'-'+dateArry[1]+'-'+dateArry[0];
      // console.log(value);
      // var x = new Date(value);
      // console.log(dateArry[2]);
      // console.log(dateArry[1]);
      // console.log(dateArry[0]);
      // console.log(dateArry[2].match("[0-9]{4}"));
      // console.log(dateArry[1].match("(0[1-9]|1[0-2])"));
      // console.log(dateArry[0].match("(0[1-9]|[1-2][0-9]|3[0-1])"));
      // return checkISO().test(value);
      // console.log(moment(value, "YYYY-MM-DD", true).isValid());
      // return moment(value, "YYYY-MM-DD", true).isValid();
      // console.log(header.criteria);
      // value = value.toString();
      // header.criteria = header.criteria.toString();
      // console.log(value.match(header.criteria));
    }
    else if(header.type === "semver"){
      return semverRegex().test(value);
    }
    return value.match(header.criteria) !== null;
    // else {
    //   return value.match(header.criteria) !== null;
    // }
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
