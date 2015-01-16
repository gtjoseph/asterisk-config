
var ConfigAMI = require('./lib/configami');
var ConfigFile = require('./lib/configfile');
var Category = require('./lib/category');

function getConfigAMI(ami, filename, cb, params) {
  var c = new ConfigAMI(ami, filename, params);
  c.read(cb);
}

function getConfigLocal(filename, cb, params) {
  var c = new ConfigFile(filename, params);
  c.read(cb);
}

module.exports.getConfigAMI = getConfigAMI;
module.exports.getConfigLocal = getConfigLocal;
module.exports.ConfigAMI = ConfigAMI;
module.exports.ConfigFile = ConfigFile;
module.exports.Category = Category;
