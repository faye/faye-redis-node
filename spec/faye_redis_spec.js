var RedisEngine = require('../faye-redis')

JS.Test.describe("Redis engine", function() { with(this) {
  before(function() {
    var pw = process.env.TRAVIS ? undefined : "foobared"
    this.engineOpts = {type: RedisEngine, password: pw, namespace: new Date().getTime().toString()}
  })

  after(function(resume) { with(this) {
    disconnect_engine()
    var redis = require('redis').createClient(6379, 'localhost', {no_ready_check: true})
    redis.auth(engineOpts.password)
    redis.flushall(function() {
      redis.end()
      resume()
    })
  }})

  itShouldBehaveLike("faye engine")

  describe("distribution", function() { with(this) {
    itShouldBehaveLike("distributed engine")
  }})

  describe("using provided clients", function() { with(this) {
    before(function() { with(this) {
      var redis = require('redis');
      var client = redis.createClient(6379, 'localhost', {no_ready_check: true})
      var subscriberClient = redis.createClient(6379, 'localhost', {no_ready_check: true})

      if(!process.env.TRAVIS) {
        client.auth("foobared")
        subscriberClient.auth("foobared")
      }

      this.engineOpts = {type: RedisEngine, client: client, subscriberClient: subscriberClient, namespace: new Date().getTime().toString()}
    }})

    itShouldBehaveLike("faye engine")
  }})

  if (process.env.TRAVIS) return

  describe("using a Unix socket", function() { with(this) {
    before(function() { with(this) {
      this.engineOpts.socket = "/tmp/redis.sock"
    }})

    itShouldBehaveLike("faye engine")
  }})

}})
