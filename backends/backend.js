const events = require('events');

const carbonRelay = require('./carbon-relay');

function Backend() {
  var self = this;
  if (!(self instanceof Backend)) {
    return new Backend();
  }

  self.events = new events.EventEmitter();
  self.events.on('sendMetrics', self.sendMetrics.bind(self));

  self.metrics = [];
  self.flushSize = 100;
  self.lastFlushTs = Date.now();
  self.flush();
}

Backend.prototype.send = function (metric) {
  let self = this;
  self.metrics.push(metric);
  self._flush();
};

Backend.prototype.flush = function () {
  let self = this;
  setTimeout(self.flush.bind(self), 200);
  self._flush();
};

Backend.prototype._flush = function () {
  let self = this;
  let now = Date.now();
  if (self.metrics.length < self.flushSize && now - self.lastFlushTs < 1000) {
    return;
  }

  self.lastFlushTs = now;

  if (self.metrics.length == 0) {
    return;
  }
  self.events.emit('sendMetrics', self.metrics);
  self.metrics = [];
};

Backend.prototype.sendMetrics = function (metrics) {
  if (metrics.length === 0) {
    return;
  }
  carbonRelay.push(metrics);
};

module.exports = Backend();
