
var fs = require('fs');
var path = require('path');
var util = require('util');

var am = require('asterisk-manager');
var lbl = require('line-by-line');
var glob = require('glob');
var async = require('async');

function trimStrings(a) {
  for (var i = 0; i < a.length; i++) {
    a[i] = a[i].trim();
  }
}

function applyexisting(ctx, nvp, params) {
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
    ctx.vars[nvp[1]] = existing.concat(nvp[2]);
  } else {
    ctx.vars[nvp[1]] = existing + dh + nvp[2];
  }
}

function parseAMI(response, params) {
  var obj = {};
  var ctx_name = '';
  var ctx;
  var attr;

  for (var l in response) {
    var mm = l.match(/category-(\d+)/);
    if (mm) {
      ctx_name = response[l];
      ctx = {};
      obj[ctx_name] = ctx;
      ctx.istemplate = 0;
      ctx.templates = [];
      if (params.varsAsArray) {
        ctx.vars = [];
      } else {
        ctx.vars = {};
      }
      continue;
    }
    if (l.match(/line-(\d+)/)) {
      ctx = obj[ctx_name];
      var nvp = response[l].match(/([^ =]+)=(.+)/);
      if (nvp && nvp.length >= 3) {
        if (params.varsAsArray) {
          ctx.vars.push(nvp[1] + '=' + nvp[2]);
        } else {
          applyexisting(ctx, nvp, params);
        }
      }
      continue;
    }
    if ((attr = l.match(/(.+)-(\d+)/))) {
      ctx = obj[ctx_name];
      ctx[attr[1]] = response[l];
      continue;
    }
  }
  return obj;
}

function getConfigAMI(ami, filename, cb, params) {
  params = params || {};
  params.action = 'getconfig';
  params.filename = filename;
  params.duphandlers = params.duphandlers || {};

  ami.action(params, function(err, response) {
    if (err) {
      cb(err, null);
      return;
    }
    cb(null, parseAMI(response, params));
  });
}

function parseLine(file, lr, obj, curr_ctx, line, params) {
  lr.pause();
  params = params || {};
  file.lineno++;
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

  if ((mm = line.match(/#include (.*)/))) {
    var newfile = mm[1];
    var newpath = path.resolve(path.dirname(file.filename), newfile);
    var matches = glob.sync(newpath);
    if (matches.length === 0) {
      throw util.format("%s:%d: %s", file.filename, file.lineno,
          'Included file(s) not found: ' + newpath);
    }

    matches.forEach(function(f, i) {
      matches[i] = fs.realpathSync(f);
    });

    async.eachSeries(matches, function(file, callback) {
      var nf = {
        filename : file,
        lineno : 0
      };
      var nlr = new lbl(file);
      nlr.on('line', function(line) {
        curr_ctx = parseLine(nf, nlr, obj, curr_ctx, line, params);
      });
      nlr.on('end', function(line) {
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
        throw util.format("%s:%d: %s", file.filename, file.lineno,
            'Existing section not found: ' + ctx_name);
      }
      lr.resume();
      return ctx_name;
    }
    ctx = {};
    ctx.istemplate = (mm[3] === '!' ? 1 : 0);
    if (mm[4] && mm[4].length > 0) {
      if (mm[4].charAt(0) === ',') {
        ctx.templates = mm[4].substring(1).split(',');
      } else {
        ctx.templates = mm[4].split(',');
      }
      trimStrings(ctx.templates);
    } else {
      ctx.templates = [];
    }
    if (params.varsAsArray) {
      ctx.vars = [];
    } else {
      ctx.vars = {};
    }
    ctx.templates.forEach(function(t, i) {
      var tctx = obj[t];
      if (!tctx) {
        throw util.format("%s:%d: %s", file.filename, file.lineno,
            'Template not found: ' + t);
      }
      if (params.varsAsArray) {
        ctx.vars = ctx.vars.concat(tctx.vars);
      } else {
        for ( var v in tctx.vars) {
          applyexisting(ctx, [ 0, v, tctx.vars[v] ], params);
        }
      }
    });
    obj[ctx_name] = ctx;
    curr_ctx = ctx_name;
  } else {
    var nvp = line.match(/\s*([^= ]+)\s*=>?\s*(.*)/);
    if (!nvp) {
      throw util.format("%s:%d: %s", file.filename, file.lineno,
          'Malforned line: ' + line);
    }
    if (params.varsAsArray) {
      obj[curr_ctx].vars.push(nvp[1] + '=' + nvp[2]);
    } else {
      applyexisting(obj[curr_ctx], nvp, params);
    }
  }
  lr.resume();
  return curr_ctx;
}

function getConfigLocal(filename, cb, params) {
  var file = {filename: filename, lineno: 0};
	var lr = new lbl(filename);
	var obj = {};
	var curr_ctx = '';
  params = params || {};
  params.duphandlers = params.duphandlers || {};
	
	lr.on('line', function(line) {
		try {
			curr_ctx = parseLine(file, lr, obj, curr_ctx, line, params);
		} catch (err) {
			console.log(err);
			cb(err, null);
		}
	});	
	lr.on('end', function(line) {
		cb(null, obj);
		lr.close();
	});	
}

module.exports.getConfigAMI = getConfigAMI;
module.exports.getConfigLocal = getConfigLocal;

