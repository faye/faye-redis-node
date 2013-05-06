var Engine = function(server, options) {
  this._server  = server;
  this._options = options || {};

  var redis  = require('redis'),
      host   = this._options.host     || this.DEFAULT_HOST,
      port   = this._options.port     || this.DEFAULT_PORT,
      db     = this._options.database || this.DEFAULT_DATABASE,
      auth   = this._options.password,
      gc     = this._options.gc       || this.DEFAULT_GC,
      socket = this._options.socket;

  this._ns  = this._options.namespace || '';

  if (socket) {
    this._redis = redis.createClient(socket, {no_ready_check: true});
    this._subscriber = redis.createClient(socket, {no_ready_check: true});
  } else {
    this._redis = redis.createClient(port, host, {no_ready_check: true});
    this._subscriber = redis.createClient(port, host, {no_ready_check: true});
  }

  if (auth) {
    this._redis.auth(auth);
    this._subscriber.auth(auth);
  }
  this._redis.select(db);
  this._subscriber.select(db);

  var self = this;
  this._subscriber.subscribe(this._ns + '/notifications');
  this._subscriber.on('message', function(topic, message) {
    self.emptyQueue(message);
  });

  this._gc = setInterval(function() { self.gc() }, gc * 1000);
};

Engine.create = function(server, options) {
  return new this(server, options);
};

Engine.prototype = {
  DEFAULT_HOST:     'localhost',
  DEFAULT_PORT:     6379,
  DEFAULT_DATABASE: 0,
  DEFAULT_GC:       60,
  LOCK_TIMEOUT:     120,

  disconnect: function() {
    this._redis.end();
    this._subscriber.unsubscribe();
    this._subscriber.end();
    clearInterval(this._gc);
  },

  createClient: function(callback, context) {
    var clientId = this._server.generateId(), self = this;
    this._redis.zadd(this._ns + '/clients', 0, clientId, function(error, added) {
      if (added === 0) return self.createClient(callback, context);
      self._server.debug('Created new client ?', clientId);
      self.ping(clientId);
      self._server.trigger('handshake', clientId);
      callback.call(context, clientId);
    });
  },

  clientExists: function(clientId, callback, context) {
    var cutoff = new Date().getTime() - (1000 * 1.6 * this._server.timeout);

    this._redis.zscore(this._ns + '/clients', clientId, function(error, score) {
      callback.call(context, parseInt(score, 10) > cutoff);
    });
  },

  destroyClient: function(clientId, callback, context) {
    var self = this;

    this._redis.zadd(this._ns + '/clients', 0, clientId, function() {
      self._redis.smembers(self._ns + '/clients/' + clientId + '/channels', function(error, channels) {
        var n = channels.length, i = 0;
        if (i === n) return self._afterSubscriptionsRemoved(clientId, callback, context);

        channels.forEach(function(channel) {
          self.unsubscribe(clientId, channel, function() {
            i += 1;
            if (i === n) self._afterSubscriptionsRemoved(clientId, callback, context);
          });
        });
      });
    });
  },

  _afterSubscriptionsRemoved: function(clientId, callback, context) {
    var self = this;
    this._redis.del(this._ns + '/clients/' + clientId + '/messages', function() {
      self._redis.zrem(self._ns + '/clients', clientId, function() {
        self._server.debug('Destroyed client ?', clientId);
        self._server.trigger('disconnect', clientId);
        if (callback) callback.call(context);
      });
    });
  },

  ping: function(clientId) {
    var timeout = this._server.timeout;
    if (typeof timeout !== 'number') return;

    var time = new Date().getTime();

    this._server.debug('Ping ?, ?', clientId, time);
    this._redis.zadd(this._ns + '/clients', time, clientId);
  },

  subscribe: function(clientId, channel, callback, context) {
    var self = this;
    this._redis.sadd(this._ns + '/clients/' + clientId + '/channels', channel, function(error, added) {
      if (added === 1) self._server.trigger('subscribe', clientId, channel);
    });
    this._redis.sadd(this._ns + '/channels' + channel, clientId, function() {
      self._server.debug('Subscribed client ? to channel ?', clientId, channel);
      if (callback) callback.call(context);
    });
  },

  unsubscribe: function(clientId, channel, callback, context) {
    var self = this;
    this._redis.srem(this._ns + '/clients/' + clientId + '/channels', channel, function(error, removed) {
      if (removed === 1) self._server.trigger('unsubscribe', clientId, channel);
    });
    this._redis.srem(this._ns + '/channels' + channel, clientId, function() {
      self._server.debug('Unsubscribed client ? from channel ?', clientId, channel);
      if (callback) callback.call(context);
    });
  },

  publish: function(message, channels) {
    this._server.debug('Publishing message ?', message);

    var self        = this,
        jsonMessage = JSON.stringify(message),
        keys        = channels.map(function(c) { return self._ns + '/channels' + c });

    var notify = function(error, clients) {
      clients.forEach(function(clientId) {
        var queue = self._ns + '/clients/' + clientId + '/messages';

        self._server.debug('Queueing for client ?: ?', clientId, message);
        self._redis.rpush(queue, jsonMessage);
        self._redis.publish(self._ns + '/notifications', clientId);

        self.clientExists(clientId, function(exists) {
          if (!exists) self._redis.del(queue);
        });
      });
    };
    keys.push(notify);
    this._redis.sunion.apply(this._redis, keys);

    this._server.trigger('publish', message.clientId, message.channel, message.data);
  },

  emptyQueue: function(clientId) {
    if (!this._server.hasConnection(clientId)) return;

    var key   = this._ns + '/clients/' + clientId + '/messages',
        multi = this._redis.multi(),
        self  = this;

    multi.lrange(key, 0, -1, function(error, jsonMessages) {
      if (!jsonMessages) return;
      var messages = jsonMessages.map(function(json) { return JSON.parse(json) });
      self._server.deliver(clientId, messages);
    });
    multi.del(key);
    multi.exec();
  },

  gc: function() {
    var timeout = this._server.timeout;
    if (typeof timeout !== 'number') return;

    this._withLock('gc', function(releaseLock) {
      var cutoff = new Date().getTime() - 1000 * 2 * timeout,
          self   = this;

      this._redis.zrangebyscore(this._ns + '/clients', 0, cutoff, function(error, clients) {
        var i = 0, n = clients.length;
        if (i === n) return releaseLock();

        clients.forEach(function(clientId) {
          this.destroyClient(clientId, function() {
            i += 1;
            if (i === n) releaseLock();
          }, this);
        }, self);
      });
    }, this);
  },

  _withLock: function(lockName, callback, context) {
    var lockKey     = this._ns + '/locks/' + lockName,
        currentTime = new Date().getTime(),
        expiry      = currentTime + this.LOCK_TIMEOUT * 1000 + 1,
        self        = this;

    var releaseLock = function() {
      if (new Date().getTime() < expiry) self._redis.del(lockKey);
    };

    this._redis.setnx(lockKey, expiry, function(error, set) {
      if (set === 1) return callback.call(context, releaseLock);

      self._redis.get(lockKey, function(error, timeout) {
        if (!timeout) return;

        var lockTimeout = parseInt(timeout, 10);
        if (currentTime < lockTimeout) return;

        self._redis.getset(lockKey, expiry, function(error, oldValue) {
          if (oldValue !== timeout) return;
          callback.call(context, releaseLock);
        });
      });
    });
  }
};

module.exports = Engine;
