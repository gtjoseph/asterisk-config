'use strict';

var EOL = require('os').EOL;
var util = require('util');
var StringBuffer = require('./stringbuffer');

function Context(name, sourceFile, fileIndex, varsAsArray) {
  this.name = name;
  this.sourceFile = sourceFile;
  this.fileIndex = fileIndex;
  this.resolvedFileIndex = 0;
  this.istemplate = 0;
  this.templates = [];
  this.vars = varsAsArray ? [] : {};
  
  var pp = {
    'name' : {
      enumerable : false,
      configurable : false,
      writable : false
    },
    'sourceFile' : {
      enumerable : false,
      configurable : false,
      writable : false
    },
    'fileIndex' : {
      enumerable : false,
      configurable : false,
      writable : false
    },
    'resolvedFileIndex' : {
      enumerable : false,
      configurable : false,
      writable : true
    },
    'istemplate' : {
      enumerable : true,
      configurable : false,
      writable : true
    },
    'templates' : {
      enumerable : true,
      configurable : false,
      writable : false
    },
    'vars' : {
      enumerable : true,
      configurable : false,
      writable : true
    }
  };
  Object.defineProperties(this, pp);
}

Context.prototype.keys = function() {
  return Object.keys(this);
};

Context.prototype.varKeys = function() {
  return Object.keys(this.vars);
};

Context.prototype.serialize = function(){
  var buf = new StringBuffer();
  buf.concat('[' + this.name + ']');
  
  if (this.istemplate || this.templates.length > 0) {
    buf.concat('(');
    if (this.istemplate) {
      buf.concat('!');
      if (this.templates.length > 0) {
        buf.concat(',');
      }
    }
    buf.concat(this.templates.join(','));
    buf.addLine(')');
  }

  if (this.vars instanceof Array) {
    buf.addLine(this.vars.join(EOL));
  } else {
    for (var n in this.vars) {
      if (!this.vars.hasOwnProperty(n)) {
        continue;
      }
      buf.addLine(n + ' = ' + this.vars[n]);
    }
  }

  return buf.toString();
};

Context.prototype.toString = function() {
  return this.serialize();
};

Context.prototype.applyVar = function(nvp, duphandlers, prepend) {
  var dh;
  /* If there's no dup handler, just assign/overwrite */
  if (!duphandlers || !(dh = duphandlers[nvp[1]])) {
    this.vars[nvp[1]] = nvp[2];
    return;
  }

  var existing = this.vars[nvp[1]];
  if (!existing) {
    if (dh === 'array') {
      this.vars[nvp[1]] = [].concat(nvp[2]);
    } else {
      this.vars[nvp[1]] = nvp[2];
    }
    return;
  }

  if (dh === 'array') {
    this.vars[nvp[1]] = prepend ? nvp[2].concat(existing) : existing.concat(nvp[2]);
  } else {
    this.vars[nvp[1]] = prepend ? nvp[2] + dh + existing : existing + dh + nvp[2];
  }
};

Context.prototype.resolve = function(obj) {
  var _this = this;
  this.templates.forEach(function(t) {
    var tctx = obj[t];
    if (!tctx) {
      throw util.format("%s:%d: %s", obj.fileName, obj.lineNumber || 0,
          'Template not found: ' + t);
    }
    if (util.isArray(_this.vars)) {
      _this.vars = tctx.vars.concat(_this.vars);
    } else {
      for (var v in tctx.vars) {
        if (tctx.vars.hasOwnProperty(v)) {
          _this.applyVar([ 0, v, tctx.vars[v] ], obj.params.duphandlers, 1);
        }
      }
    }
  });
};

module.exports = Context;
