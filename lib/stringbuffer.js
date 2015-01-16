var EOL = require('os').EOL;

function StringBuffer(lineEnding) {
  var value = '';
  
  this.concat = function(string) {
    value += string;
  };
  this.addLine = function(line) {
    value += ((line ? line : '') + (lineEnding || EOL));
  };
  this.toString = function() {
    return value;
  };
}

module.exports = StringBuffer;
