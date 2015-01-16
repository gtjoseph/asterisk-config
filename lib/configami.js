'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var Category = require('./category');

function ConfigAMI(ami, fileName, params) {
  
  if (!ami) {
    throw 'You must supply an ami object.';
  }
  
  if (!fileName) {
    throw 'You must supply a fileName.';
  }
  
  this.ami = ami;
  this.fileName = fileName;
  this.params = params || {};
  this.params.duphandlers = this.params.duphandlers || {};
  this.amiparams = {};
  this.amiparams.action = 'getconfig';
  this.amiparams.filename = fileName;
  this.amiparams.category = params.category;
  this.amiparams.filter = params.filter || 'TEMPLATES=include';
  this.ctxCounter = 0;
  
  var pp = {
      'ami' : {
        enumerable : false,
        configurable : false,
        writable : false
      },
      'fileName' : {
        enumerable : false,
        configurable : false,
        writable : false
      },
      'ctxCounter' : {
        enumerable : false,
        configurable : false,
        writable : true
      },
      'amiparams' : {
        enumerable : false,
        configurable : false,
        writable : false
      },
      'params' : {
        enumerable : false,
        configurable : false,
        writable : false
      },
    };
    Object.defineProperties(this, pp);
}

function parseResponse(_this, resp_array) {
  var ctx_name = '';
  var ctx;

  for (var i = 0; i < resp_array.length; i++) {
    var lmatch = resp_array[i].match(/([^:]+): (.*)/);
    var name = lmatch[1];
    var value = lmatch[2];
    
    switch(name.match(/([^-]+)-/)[1]) {
    case 'category':
      ctx_name = value;
      ctx = new Category(ctx_name, _this.filename, _this.ctxCounter++, _this.params.varsAsArray);
      _this[ctx_name] = ctx;
      break;
    case 'line':
      ctx = _this[ctx_name];
      var nvp = value.match(/([^ =]+)=(.+)/);
      if (nvp && nvp.length >= 3) {
        if (_this.params.varsAsArray) {
          ctx.vars.push(nvp[1] + '=' + nvp[2]);
        } else {
          ctx.applyVar(nvp, _this.params.duphandlers);
        }
      }
      break;
    case 'templates':
      ctx = _this[ctx_name];
      ctx.templates.push(value);
      break;
    case 'istemplate':
      ctx = _this[ctx_name];
      ctx.istemplate = Number(value);
      break;
    default:
      throw 'Unrecognized AMI response: '+name+': '+value;
    }
  }
  return _this;
}

function amiResponseSorter(a, b) {
  var amatch = a.match(/([^-]+)-(\d+)-?(\d+)?/);
  var bmatch = b.match(/([^-]+)-(\d+)-?(\d+)?/);
  
  var newa = amatch[2]+amatch[1]+amatch[3];
  var newb = bmatch[2]+bmatch[1]+bmatch[3];
  
  if (newa !== newb) {
    return newa < newb ? -1 : 1; 
  }
  
  return 0;
}

ConfigAMI.prototype.read = function(callback) {
  if (!callback) {
    return -1;
  }
  
  var _this = this;
  this.ami.action(this.amiparams, function(err, response) {
    if (err) {
      callback(err, null);
      return;
    }
    var resp_array = [];
    delete response.actionid;
    delete response.response;
    
    for (var name in response) {
      if (!response.hasOwnProperty(name)) {
        continue;
      }
      resp_array.push(name + ': '+response[name]);
    }
    
    resp_array.sort(amiResponseSorter);
    callback(null, parseResponse(_this, resp_array));
  });
  
  return 0;
};

module.exports = ConfigAMI;
