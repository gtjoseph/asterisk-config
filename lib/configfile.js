var EOL = require('os').EOL;
var util = require('util');
var path = require('path');
var fs = require('fs');
var StringBuffer = require('./stringbuffer');
var Context = require('./context');
var lbl = require('line-by-line');
var glob = require('glob');
var async = require('async');

function ConfigFile(fileName, params) {
  this.fileName = fileName;
  this.ctxCounter = 0;
  this.resolvedCtxCounter = 0;
  this.lineNumber = 0;
  this.params = params || {};
  this.params.duphandlers = this.params.duphandlers || {};
    
  var pp = {
      'fileName' : {
        enumerable : false,
        configurable : false,
        writable : true
      },
      'lineNumber' : {
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

function applyexisting(ctx, nvp, params, prepend) {
  var dhs = params.duphandlers;
  var dh;
  /* If there's no dup handler, just assign/overwrite */
  if (!(dh = dhs[nvp[1]])) {
    ctx.vars[nvp[1]] = nvp[2];
    return;
  }

  var existing = ctx.vars[nvp[1]];
  if (!existing) {
    if (dh === 'array') {
      ctx.vars[nvp[1]] = [].concat(nvp[2]);
    } else {
      ctx.vars[nvp[1]] = nvp[2];
    }
    return;
  }

  if (dh === 'array') {
    ctx.vars[nvp[1]] = prepend ? nvp[2].concat(existing) : existing.concat(nvp[2]);
  } else {
    ctx.vars[nvp[1]] = prepend ? nvp[2] + dh + existing : existing + dh + nvp[2];
  }
}

function resolveContext(obj, ctx) {
  ctx.templates.forEach(function(t) {
    var tctx = obj[t];
    if (!tctx) {
      throw util.format("%s:%d: %s", obj.fileName, obj.lineNumber,
          'Template not found: ' + t);
    }
    if (util.isArray(ctx.vars)) {
      ctx.vars = tctx.vars.concat(ctx.vars);
    } else {
      for ( var v in tctx.vars) {
        if (tctx.vars.hasOwnProperty(v)) {
          applyexisting(ctx, [ 0, v, tctx.vars[v] ], obj.params, 1);
        }
      }
    }
  });
}

ConfigFile.prototype.parse = function(cb) {
  var lr = new lbl(this.fileName);
  var curr_ctx = '';
  var params = this.params;
  var cf = this;
  
  lr.on('line', function(line) {
    try {
      curr_ctx = parseLine(cf, lr, curr_ctx, line, params);
    } catch (err) {
      console.log(err);
      cb(err, null);
    }
  }); 
  lr.on('end', function(line) {
    var ctx_names = [];
    for (var ctx_name in cf) {
      if (cf[ctx_name] instanceof Context && !params.suppressInheritance) {
        ctx_names.push(ctx_name);
      }
    }
    ctx_names.sort(function(a, b){
      return cf[a].resolvedFileIndex - cf[b].resolvedFileIndex;
    });
    
    ctx_names.forEach(function(ctx_name){
      resolveContext(cf, cf[ctx_name]);
    }); 
    
    cb(null, cf);
    lr.close();
  }); 
};

function parseLine(obj, lr, curr_ctx, line, params) {
  lr.pause();
  obj.lineNumber++;
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
    var newpath = path.resolve(path.dirname(obj.fileName), newfile);
    var matches = glob.sync(newpath);
    if (matches.length === 0) {
      throw util.format("%s:%d: %s", obj.fileName, obj.lineNumber,
          'Included file(s) not found: ' + newpath);
    }

    matches.forEach(function(f, i) {
      matches[i] = fs.realpathSync(f);
    });

    async.eachSeries(matches, function(file, callback) {
      var newParams = JSON.parse(JSON.stringify(params));
      newParams.suppressInheritance = true;
      var newFile = new ConfigFile(file, newParams);
      newFile.parse(function(err, newObj){
        for (var newCtx in newObj) {
          if (!newObj.hasOwnProperty(newCtx)) {
            continue;
          }
          obj[newCtx] = newObj[newCtx];
          obj[newCtx].resolvedFileIndex = obj.resolvedCtxCounter++;
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
      ctx = obj[ctx_name];
      if (!ctx) {
        throw util.format("%s:%d: %s", obj.fileName, obj.lineNumber,
            'Existing section not found: ' + ctx_name);
      }
      lr.resume();
      return ctx_name;
    }
    ctx = new Context(ctx_name, obj.fileName, obj.ctxCounter++, params.varsAsArray);
    ctx.resolvedFileIndex = obj.resolvedCtxCounter++;
    ctx.istemplate = (mm[3] === '!' ? 1 : 0);
    
    if (mm[4] && mm[4].length > 0) {
      var ts = '';
      if (mm[4].charAt(0) === ',') {
        ts = mm[4].substring(1);
      } else {
        ts = mm[4];
      }
      ts.split(',').forEach(function(t){
        ctx.templates.push(t.trim());
      });
    }

    obj[ctx_name] = ctx;
    curr_ctx = ctx_name;
  } else {
    var nvp = line.match(/\s*([^= ]+)\s*=>?\s*(.*)/);
    if (!nvp) {
      throw util.format("%s:%d: %s", obj.fileName, obj.lineNumber,
          'Malforned line: ' + line);
    }
    if (util.isArray(obj[curr_ctx].vars)) {
      obj[curr_ctx].vars.push(nvp[1] + '=' + nvp[2]);
    } else {
      applyexisting(obj[curr_ctx], nvp, params);
    }
  }
  lr.resume();
  return curr_ctx;
}


module.exports = ConfigFile;