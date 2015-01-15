var EOL = require('os').EOL;
var StringBuffer = require('./stringbuffer');

function Context(name, sourceFile, fileIndex, varsAsArray) {
  this.name = name;
  this.sourceFile = sourceFile;
  this.fileIndex = 0;
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
      writable : false
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

module.exports = Context;
