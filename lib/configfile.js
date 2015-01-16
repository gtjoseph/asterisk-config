'use strict';

var EOL = require('os').EOL;
var util = require('util');
var path = require('path');
var fs = require('fs');
var Category = require('./category');
var lbl = require('line-by-line');
var glob = require('glob');
var async = require('async');

function ConfigFile(fileName, params) {
  this.fileName = fileName;
  this.ctxCounter = 0;
  this.resolvedCtxCounter = 0;
  this.lineCounter = 0;
  this.params = params || {};
  this.params.duphandlers = this.params.duphandlers || {};
    
  var pp = {
      'fileName' : {
        enumerable : false,
        configurable : false,
        writable : true
      },
      'lineCounter' : {
        enumerable : false,
        configurable : false,
        writable : true
      },
      'ctxCounter' : {
        enumerable : false,
        configurable : false,
        writable : true
      },
      'resolvedCtxCounter' : {
        enumerable : false,
        configurable : false,
        writable : true
      },
      'params' : {
        enumerable : false,
        configurable : false,
        writable : false
      },
    };
    Object.defineProperties(this, pp);
}

function parseLine(_this, lr, curr_ctx, line) {
  lr.pause();
  _this.lineCounter++;
  line = line.trim();
  var mm;

  /* Skip lines beginning with ; */
  if (line.length === 0 || line.match(/^\s*;/)) {
    lr.resume();
    return curr_ctx;
  }
  /* trim comments after an unescaped ; */
  if ((mm = line.match(/(.+)(?:[^\\];)/))) {
    line = mm[1];
  }

  if ((mm = line.match(/#include ["]?([^"]+)["]?/))) {
    var newfile = mm[1];
    var newpath = path.resolve(path.dirname(_this.fileName), newfile);
    var matches = glob.sync(newpath);
    if (matches.length === 0) {
      throw util.format("%s:%d: %s", _this.fileName, _this.lineCounter,
          'Included file(s) not found: ' + newpath);
    }

    matches.forEach(function(f, i) {
      matches[i] = fs.realpathSync(f);
    });

    async.eachSeries(matches, function(file, callback) {
      var newParams = JSON.parse(JSON.stringify(_this.params));
      newParams.suppressInheritance = true;
      var newFile = new ConfigFile(file, newParams);
      newFile.parse(function(err, newObj){
        for (var newCtx in newObj) {
          if (!newObj.hasOwnProperty(newCtx)) {
            continue;
          }
          _this[newCtx] = newObj[newCtx];
          _this[newCtx].resolvedFileIndex = _this.resolvedCtxCounter++;
        }
        callback();
      });
    }, function(err) {
      lr.resume();
    });

    return curr_ctx;
  }

  if ((mm = line.match(/#exec (.*)/))) {
    lr.resume();
    return curr_ctx;
  }

  /* parse the context, template indicator and templates */
  if ((mm = line.match(/^\[(.+)\](?:\((([!+])?(.*))\))?/))) {
    var ctx;
    var ctx_name = mm[1];
    if (mm[3] === '+') {
      ctx = _this[ctx_name];
      if (!ctx) {
        throw util.format("%s:%d: %s", _this.fileName, _this.lineCounter,
            'Existing section not found: ' + ctx_name);
      }
      lr.resume();
      return ctx_name;
    }
    
    ctx = new Category(ctx_name, _this.fileName, _this.ctxCounter++, _this.params.varsAsArray);
    ctx.resolvedFileIndex = _this.resolvedCtxCounter++;
    
    ctx.isTemplate = (mm[3] === '!' ? 1 : 0);
    
    if (mm[4]) {
      mm[4].split(',').forEach(function(t){
        if (t.length > 0) {
          ctx.templates.push(t.trim());
        }
      });
    }
    _this[ctx_name] = ctx;
    curr_ctx = ctx_name;
  } else {
    var nvp = line.match(/\s*([^= ]+)\s*=>?\s*(.*)/);
    if (!nvp) {
      throw util.format("%s:%d: %s", _this.fileName, _this.lineCounter,
          'Malforned line: ' + line);
    }
    if (util.isArray(_this[curr_ctx].vars)) {
      _this[curr_ctx].vars.push(nvp[1] + '=' + nvp[2]);
    } else {
      _this[curr_ctx].applyVar(nvp, _this.params.duphandlers);
    }
  }
  lr.resume();
  return curr_ctx;
}

ConfigFile.prototype.read = function(cb) {
  var lr = new lbl(this.fileName);
  var curr_ctx = '';
  var _this = this;
  
  lr.on('line', function(line) {
    try {
      curr_ctx = parseLine(_this, lr, curr_ctx, line);
    } catch (err) {
      console.log(err);
      cb(err, null);
    }
  });
  
  lr.on('end', function(line) {
    if (!_this.params.suppressInheritance) {
      var ctx_names = [];
      for (var ctx_name in _this) {
        if (_this[ctx_name] instanceof Category) {
          ctx_names.push(ctx_name);
        }
      }
      ctx_names.sort(function(a, b){
        return _this[a].resolvedFileIndex - _this[b].resolvedFileIndex;
      });
      
      ctx_names.forEach(function(ctx_name){
        _this[ctx_name].resolve(_this);
      }); 
    }
    
    cb(null, _this);
    lr.close();
  }); 
};

module.exports = ConfigFile;