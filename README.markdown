# faye-redis

This package provides a Redis-based backend for the (Faye)[http://faye.jcoglan.com]
pub/sub server for (Node)[http://nodejs.org]. It lets you run a single Faye
service distributed across multiple web servers.


## Usage

You can make Faye use this engine by passing the constructor along with some
configuration options.

```js
var faye  = require('faye'),
    redis = require('faye-redis'),
    http  = require('http');

var server = http.createServer();

var bayeux = new faye.NodeAdapter({
  mount:    '/faye',
  timeout:  45,
  engine: {
    type:       redis,
    host:       'REDIS_HOST',   // default is 'localhost'
    port:       'REDIS_PORT'    // default is 6379
  }
});

bayeux.attach(server);
server.listen(8000);
```

As well as the `host` and `port` options, the engine supports the following
optional settings:

* **`socket`** - Path to a Unix socket if you'd rather connect that way
* **`password`** - Required if your Redis server requires a password
* **`database`** - Number, selects which Redis DB to use
* **`namespace`** - String, prefixed to all keys if specified


## License

(The MIT License)

Copyright (c) 2009-2011 James Coglan

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
