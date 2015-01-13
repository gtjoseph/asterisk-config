

# asterisk-config

An Asterisk config file parser that processes templates, includes, and additions.  Can be used via AMI or on local files.

## Install

```
npm install asterisk-config
```

## Usage

```javascript
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

if (1) {
	ac.getConfigAMI(ami, 'test.conf', cb,
		{ 	varsAsArray:false,
			filter: "TEMPLATES=include",
			duphandlers: {
				'allow': ',',
				'deny': ',',
				'match': 'array'
			}});
} else {
	ac.getConfigLocal('/etc/asterisk/test.conf', cb,
		{	varsAsArray:false,
			duphandlers: {
				'allow': ',',
				'deny': ',',
				'match': 'array'
			}});
}

```

## License

MIT License
-----------

Copyright (C) 2015 Fairview 5 Engineering, LLC

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


