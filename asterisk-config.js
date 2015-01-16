
var ConfigAMI = require('./lib/configami');
var ConfigFile = require('./lib/configfile');
var Context = require('./lib/context');

function getConfigAMI(ami, filename, cb, params) {
  var c = new ConfigAMI(ami, filename, params);
  c.parse(cb);
}

function getConfigLocal(filename, cb, params) {
  var c = new ConfigFile(filename, params);
  c.parse(cb);
}

module.exports.getConfigAMI = getConfigAMI;
module.exports.getConfigLocal = getConfigLocal;
module.exports.ConfigAMI = ConfigAMI;
module.exports.ConfigFile = ConfigFile;
module.exports.Context = Context;

