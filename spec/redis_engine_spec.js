var RedisEngine = require('../faye-redis')

JS.ENV.RedisEngineSpec = JS.Test.describe("Redis engine", function() { with(this) {
  before(function() {
    this.engineOpts = {type: RedisEngine, password: "foobared", namespace: new Date().getTime().toString()}
  })
  after(function() { this.clean_redis_db() })
  
  itShouldBehaveLike("faye engine")
  
  describe("distribution", function() { with(this) {
    itShouldBehaveLike("distributed engine")
  }})
  
  describe("using a Unix socket", function() { with(this) {
    before(function() { with(this) {
      this.engineOpts.socket = "/tmp/redis.sock"
    }})
    
    itShouldBehaveLike("faye engine")
  }})
}})
