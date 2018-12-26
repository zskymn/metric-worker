const events = require('events');

const _ = require('lodash');
const LOG = require('../common/logger');

const backend = require('../backends/backend');

function CounterWorker(options) {
  if (!(this instanceof CounterWorker)) {
    return new CounterWorker(options);
  }
  this.reset();
}

CounterWorker.prototype.reset = function () {
  let self = this;
  self.metrics = {};

  self.events = new events.EventEmitter();
  self.events.on('pushBackends', self.pushBackends);

  self.flushInterval = 1000 * 60;
  setTimeout(self.flush.bind(self), self.flushInterval - Date.now() % self.flushInterval);
};

CounterWorker.prototype.flush = function () {
  let self = this;
  let now = Date.now();
  self.lastFlush = now;

  setTimeout(self.flush.bind(self), self.flushInterval - now % self.flushInterval);

  self.events.emit('pushBackends', self.metrics);
  self.metrics = {};
};

CounterWorker.prototype.pushBackends = function (metrics) {
  let now = Date.now();
  // 将时间戳格式化为该分钟的30s
  let ts = Math.floor(((now / 1000 - 30) / 60)) * 60 + 30;
  let _sendFun = backend.send.bind(backend);
  _.each(metrics, function (metric) {
    let _metric = {
      ts: ts,
      name: metric.name,
      value: metric.value
    };
    _sendFun(_metric);
  });

};

CounterWorker.prototype.add = function (metrics) {
  let self = this;
  _.each(metrics, function (metric) {
    if (!_.isObject(metric)) {
      self._metricInvalidLog('metric is not dict', metric);
      return;
    }

    if (metric.type !== 'counter') {
      self._metricInvalidLog('metric type is not counter', metric);
      return;
    }

    if (!_.isNumber(metric.value)) {
      self._metricInvalidLog('metric value is not number', metric);
      return;
    }

    let _last = self.metrics[metric.name];
    if (_last) {
      metric.value = _last.value + metric.value;
    }

    self.metrics[metric.name] = metric;
  });
};

CounterWorker.prototype._metricInvalidLog = function (msg, metric) {
  LOG.warn({
    detail: {
      msg: msg,
      metric: metric
    }
  }, 'worker-counter-log');
};

module.exports = CounterWorker;
