require('jsclass')
JS.require('JS.Range', 'JS.Test')

Faye = require('../vendor/faye/build/faye-node')
require('../vendor/faye/spec/javascript/engine_spec')
require('./faye_redis_spec')

JS.Test.autorun()
