

# asterisk-config

An Asterisk config file parser that processes templates, includes, and additions.  Can be used via AMI or on local files.

## Install

`npm install asterisk-config`

## Usage

```js
var am = require('asterisk-manager');
var ac = require('asterisk-config');
var util = require('util');

var cb = function(obj) {
	if (obj)
		console.log(util.inspect(obj, { showHidden: true, depth: null, colors:true }));
	ami.disconnect();
	process.exit(0);
};

var ami = new am('5038','localhost','astadmin','yourpassword', false);

ac.getConfigAMI(ami, 'test.conf', cb,
	{ 	varsAsArray:false,
		filter: "TEMPLATES=include",
		duphandlers: {
			'allow': ',',
			'deny': ',',
			'match': 'array'
		}});

ac.getConfigLocal('/etc/asterisk/test.conf', cb,
	{	varsAsArray:false,
		duphandlers: {
			'allow': ',',
			'deny': ',',
			'match': 'array'
		}});

```

## Methods

#### getConfigAMI(ami_object, filename, callback[, options])

* **ami_object**: An asterisk-manager ami object
* **filename**:  The file to retrieve.  Must be relative to the Asterisk configuration directory, usually `/etc/asterisk`
* **callback**: `callback(error, object)`
* **options**: Optional parameters object
 * **category**: The name of the category to retrieve.  If not specified, all categories in the file
 will be returned.
 * **filter**:  The GetConfig AMI command (which this method uses) can take a `filter` argument to further control 
 what categories are returned.  See the documentation for GetConfig (`manager show command GetConfig`) for more
 information.
 * **varsAsArray**:  If `false` (the default), each categories' lines will be parsed into a name/value pair object.
 This presents problems when parsing files like extensions.conf where all of the variable names are `exten` or `include`, etc..
 So, if this option is set to `true`, each categories' contents are returned as an array of lines without further
 parsing into name/value pairs.
 * **duphandlers**:  When varsAsArray is `true`, there's no issue with duplicate variable names because they're
 stored as an array.  When the file is parsed into an object however, there can't be duplicate attributes
 in the resulting object.  The default behavior is to overwrite earlier occurrences with the latest but
 some variables can be legally duplicated like the codec `allow` and `deny` variables.
 For these cases, you can choose how duplicates are concatenated by providing an object with attributes in the
 form of `variable_name: separator` where `variable_name` is the name of the variable to handle and
 `separator` is the string to use to delimit the concatenated string.  The special separator `array`
 will cause the individual values to be placed into an array instead of a concatenated string.  In this case,
 the result will be an array even if there's only 1 element.
 
#### getConfigLocal(filename, callback[, options])

* **filename**:  The file to retrieve. Should be an absolute pathname
* **callback**: `callback(error, object)`
* **options**: Optional parameters object
 * **varsAsArray**:  See above
 * **duphandlers**:  See above
 
## License

Copyright (C) 2015 Fairview 5 Engineering, LLC <developers@fairview5.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.


