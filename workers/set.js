const events = require('events');

const _ = require('lodash');
const LOG = require('../common/logger');

const backend = require('../backends/backend');

const TS_2000_MS = 946684800000;

function SetWorker(options) {
  if (!(this instanceof SetWorker)) {
    return new SetWorker(options);
  }
  this.reset();
}

SetWorker.prototype.reset = function () {
  let self = this;
  self.metrics = {};

  self.events = new events.EventEmitter();
  self.events.on('pushBackends', self.pushBackends);

  self.flushInterval = 1000 * 60;
  setTimeout(self.flush.bind(self), self.flushInterval - Date.now() % self.flushInterval);
};

SetWorker.prototype.flush = function () {
  let self = this;
  let now = Date.now();
  self.lastFlush = now;

  setTimeout(self.flush.bind(self), self.flushInterval - now % self.flushInterval);

  self.events.emit('pushBackends', self.metrics);
  self.metrics = {};
};

SetWorker.prototype.pushBackends = function (metrics) {
  let _sendFun = backend.send.bind(backend);
  _.each(metrics, function (metric) {
    let _metric = {
      ts: metric.ts,
      name: metric.name,
      value: metric.value
    };
    _sendFun(_metric);
  });
};

SetWorker.prototype.add = function (metrics) {
  let self = this;
  _.each(metrics, function (metric) {
    if (!_.isObject(metric)) {
      self._metricInvalidLog('metric is not dict', metric);
      return;
    }

    if (metric.type !== 'set') {
      self._metricInvalidLog('metric type is not set', metric);
      return;
    }

    if (!_.isNumber(metric.value)) {
      self._metricInvalidLog('metric value is not number', metric);
      return;
    }

    if (_.isNumber(metric.ts)) {
      if (metric.ts > TS_2000_MS) {
        metric.ts = Math.floor(metric.ts / 1000);
      }
    } else {
      metric.ts = Math.floor(Date.now() / 1000);
    }

    // 将时间戳格式化为该分钟的30s
    metric.ts = Math.floor(metric.ts / 60) * 60 + 30;
    self.metrics[`${metric.name}:${metric.ts}`] = metric;
  });
};

SetWorker.prototype._metricInvalidLog = function (msg, metric) {
  LOG.warn({
    detail: {
      msg: msg,
      metric: metric
    }
  }, 'worker-set-log');
};

module.exports = SetWorker;
