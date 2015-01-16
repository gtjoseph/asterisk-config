

# asterisk-config [![NPM](https://nodei.co/npm/asterisk-config.png)](https://nodei.co/npm/asterisk-config/) 
[![Total views](https://sourcegraph.com/api/repos/github.com/f5eng/asterisk-config/.counters/views.png)](https://sourcegraph.com/github.com/f5eng/asterisk-config)

An Asterisk config file parser that processes templates, includes, and section additions.
Can be used via AMI or on local files.

__Contents__

* [**Install**](#install)
* [**Quickstart**](#quickstart)
* [**Objects**](#objects)
* [**Samples**](#samples)
* [**License**](#license)

<a name='install'/>
## Install

`npm install asterisk-config`

#### Dependencies
* For AMI retrieval
	* asterisk-manager
* For local file retrieval
	* async
	* glob
	* line-by-line

<a name='quickstart'/>
## Quick Start

```js
var am = require('asterisk-manager');
var ac = require('asterisk-config');
var util = require('util');

var ami = new am('5038','localhost','astadmin','yourpassword', false);

var cb = function(err, obj) {
	if (err)
		console.log(err);
	else if (obj)
		console.log(obj);
	ami.disconnect();
	process.exit(0);
};

/* Call remotely via AMI */
ac.getConfigAMI(ami, 'test.conf', cb,
	{ 	varsAsArray:false,
		filter: "TEMPLATES=include",
		duphandlers: {
			'allow': ',',
			'deny': ',',
			'match': 'array'
		}});

/* Call directly on local file */
ac.getConfigLocal('/etc/asterisk/test.conf', cb,
	{	varsAsArray:false,
		duphandlers: {
			'allow': ',',
			'deny': ',',
			'match': 'array'
		}});
```

<a name='objects'/>
## Objects

### Category(_name_ [ [ [ , _sourceFile_ ] , _fileIndex_ ] , _varsAsArray_ ])
A Category object is created for every `[category]` entry found in the config file.

__Constructor__
 * ___name___ - The name of this category.
 * ___sourceFile___ - The file this category was defined in.
 * ___fileIndex___ - This category's order in the file.
 * ___varsAsArray___ - Determines whether the ___vars___ property is an array or object.

__Properties__
 * ___name___ - The category name.  (non-enumerable)
 * ___sourceFile___ - The file this cntext was defined in.  (non-enumerable)
 * ___fileIndex___ - This category's order in the file.  (non-enumerable)
 * ___resolvedFileIndex___ - Since files can include other files, this is the fully resolved order 
  related to the outermost file. (non-enumerable)
 * ___isTemplate___ -  Set to `1` if this category is a template.
 * ___templates___ - An array of category names this category inherits from.
 * ___vars___ - If ___varsAsArray___ is `true`, then this is an array of lines for the category 
 in the order they were defined in the config file.  Otherwise this is an object containing 
 the variables for the category.  See the ___duphandlers___ discussion below.
 
__Methods__
 * __.serialize()__ - The resulting string will contain a representation of the category that can be 
 used in a config file.
 * __.resolve(*configFile*)__ - If this category was created with the ___suppressInheritance___ flag set, meaning 
 its templates were not applied, calling resolve with a __ConfigFile__ object will fully resolve the category using 
 the templates found in that object.
 * __.applyVar({*name*: *value*} [ [ , { *duphandlers* } ] , *prepend* ])__ - Applies the name/value pair to the category using 
 the supplied ___duphandlers___.  If ___prepend___ is set to `true`, the value will be prepended to the existing values, 
 otherwise it will be appended.  
 
### ConfigFile(_fileName_ [ , _params_ ])
Represents the contents of a local config file and its includes.

__Constructor__
 * ___fileName___ - The root file to parse.
 * ___params___ - Optional parameter object.
   * ___varsAsArray___:  If `false` (the default), each categories' lines will be parsed into a name/value pair object.
      This presents problems when parsing files like extensions.conf where all of the variable names are `exten` or `include`, etc..
      So, if this option is set to `true`, each categories' contents are returned as an array of lines without further
      parsing into name/value pairs.
   * ___duphandlers___:  When varsAsArray is `true`, there's no issue with duplicate variable names because they're
      stored as an array.  When the file is parsed into an object however, there can't be duplicate attributes
      in the resulting object.  The default behavior is to overwrite earlier occurrences with the latest but
      some variables can be legally duplicated like the codec `allow` and `deny` variables.
      For these cases, you can choose how duplicates are concatenated by providing an object with attributes in the
      form of `variable_name: separator` where `variable_name` is the name of the variable to handle and
      `separator` is the string to use to delimit the concatenated string.  The special separator `array`
      will cause the individual values to be placed into an array instead of a concatenated string.  In this case,
      the result will be an array even if there's only 1 element.
   * ___suppressInheritance___:  If set to `true`, properties from templates will not be interited.  The `templates`
   array will still be populated if you wish to do your own inheritance processing.
    
__Properties__
 * ___fileName___ - The root file this object represents. (non-enumerable)
 * ___params___ - The parameters object used int he constructor. (non-enumerable)
 * ___Category...___ - The rest of this objects enumerable properties are __Category__ objects keyed by their names.
 
__Methods__
 * __parse(*callback(error, configFile)*)__ - Does the actual parsing and calls the callback with an error or this
 __ConfigFile__ object. 

### ConfigAMI(*ami*, *fileName* [ , *params* ])
Represents the contents of a remote config file and its includes.  The file is retrieved
using the AMI *GetConfig* command.

__Constructor__
 * ___ami___ - An AMI object created with *asterisk-manager*.
 * ___fileName___ - The root file to parse.
 * ___params___ - Optional parameter object.
   * ___varsAsArray___:  See above.
   * ___duphandlers___:  See above.
   * ___category___:  If specified, limits the result to only a single category.
   * ___filter___:  Also limits the results.  For more information, run `manager show command GetConfig`
   in the Asterisk CLI.
    
__Properties__
 * ___fileName___ - The root file this object represents. (non-enumerable)
 * ___params___ - The parameters object used in the constructor. (non-enumerable)
 * ___Category...___ - The rest of this objects enumerable properties are __Category__ objects keyed by their names.
 
__Methods__
 * __parse(*callback(error, configFile)*)__ - Does the actual parsing and calls the callback with an error or this
 __ConfigAMI__ object. 

### asterisk-config

__Methods__
 * __getConfigLocal(*fileName*, *callback* [ , *parameters* ])__ - A wrapper around `new ConfigAMI(...)` and
 `parse(...)`. 
 * __getConfigAMI(*ami*, *fileName*, *callback* [ , *parameters* ])__ - A wrapper around `new ConfigFileI(...)` and
 `parse(...)`. 
 
 
<a name='samples'/>
## Sample Input/Output

#### Simple scenario

reading:
```
[template1](!)
variable1 = value1
variable2 = value2
allow = ulaw

[mything](template1)
variable2 = my_value2
allow = gsm
```
using:
```js
ac.getConfigLocal('test.conf', callback,
	{	varsAsArray:false,
		duphandlers: {
			'allow': ',',
			'deny': ',',
			'match': 'array'
		}});
```
should pass the following __ConfigFile__ object with 2 __Category__ objects to the callback:
```
{ template1: 
   { isTemplate: 1,
     templates: [],
     vars: 
      { variable1: 'value1',
        variable2: 'value2',
        allow: 'ulaw' } },
  mything: 
   { isTemplate: 0,
     templates: [ 'template1' ],
     vars: 
      { variable1: 'value1',		// Inherited from template1
        variable2: 'my_value2',		// Overridden from template1
        allow: 'ulaw,gsm' } } }		// Concatenated values

```

#### More complex scenario

reading:
```
[template1](!)
variable1 = value1 from template1
variable2 = value2 from template1
allow = ulaw
match = 192.168.0.1

[template2](!,template1)
variable1 = value1 from template2
variable3 = value3 from template2
allow = gsm
match = 192.168.0.2

#include test2.conf

[mything2](template2)
variable2 = my_value2
allow = gsm
match = 192.168.0.88
```

and test2.conf:
```
[mything1](template1)
variable2 = my_value2
allow = g729
match = 192.168.0.99
```

using:
```js

var params = { 
	varsAsArray:false, 
	duphandlers: { 'allow': ',', 'deny': ',', 'match': 'array' }}; 

var configFile = new ConfigFile('test.conf', params);
configFile.parse(callback);
		
```
should pass the following __ConfigFile__ object with 4 __Category__ objects to the callback:
```
{ template1: 
   { istemplate: 1,
     templates: [],
     vars: 
      { variable1: 'value1 from template1',
        variable2: 'value2 from template1',
        allow: 'ulaw',
        match: [ '192.168.0.1' ] } },
  template2: 
   { istemplate: 1,
     templates: [ 'template1' ],
     vars: 
      { variable1: 'value1 from template2',
        variable2: 'value2 from template1',		 // Inherited from template1
        allow: 'ulaw,gsm',						 // Concatenated from local and template1
        match: 
         [ '192.168.0.1',						 // Inherited from template1
           '192.168.0.2' ],						 // Specified locally
        variable3: 'value3 from template2' } },	 // Specified locally
  mything1: 
   { istemplate: 0,
     templates: [ 'template1' ],
     vars: 
      { variable1: 'value1 from template1',		 // Inherited from template1
        variable2: 'my_value2',					 // Overridden from template1
        allow: 'ulaw,g729',						 // Concatenated from local and template1
        match: 
         [ '192.168.0.1',						 // Inherited from template1
           '192.168.0.99' ] } },				 // Specified locally
  mything2: 
   { istemplate: 0,
     templates: [ 'template2' ],
     vars: 
      { variable1: 'value1 from template2',				
        variable2: 'my_value2',					 // Specified locally
        allow: 'ulaw,gsm,g722',					 // Concatenated from local, template1, template2
        match: 
         [ '192.168.0.1',						 // Inherited from template1
           '192.168.0.2',						 // Inherited from template2
           '192.168.0.88' ],					 // Specified locally
        variable3: 'value3 from template2' } } } // Inherited from template2

```

#### Extensions.conf scenario

reading:
```
[default]
exten = _1[01]XX,1,Dial(SIP/${EXTEN})
exten = _1[23]XX,1,Dial(PJSIP/${EXTEN})

[my_context]
include = default
exten = _1[78]XX,1,Dial(Local/${EXTEN})
```
using:
```js
ac.getConfigLocal('extensions.conf', cb, {varsAsArray:true});
```
should produce:
```
{ default: 
   { istemplate: 0,
     templates: [],
     vars: 											//  Note that vars is an array
      [ 'exten=_1[01]XX,1,Dial(SIP/${EXTEN})',
        'exten=_1[23]XX,1,Dial(PJSIP/${EXTEN})' ] },
  my_context: 
   { istemplate: 0,
     templates: [ [length]: 0 ],
     vars: 
      [ 'include=default',
        'exten=_1[78]XX,1,Dial(Local/${EXTEN})' ] } }
```
 
<a name='license'/>
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


