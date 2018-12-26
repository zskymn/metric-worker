const events = require('events');

const _ = require('lodash');
const LOG = require('../common/logger');

const backend = require('../backends/backend');

function TimingWorker(options) {
  if (!(this instanceof TimingWorker)) {
    return new TimingWorker(options);
  }
  this.reset();
}

TimingWorker.prototype.reset = function () {
  let self = this;
  self.metrics = {};

  self.events = new events.EventEmitter();
  self.events.on('pushBackends', self.pushBackends);

  self.flushInterval = 1000 * 60;
  setTimeout(self.flush.bind(self), self.flushInterval - Date.now() % self.flushInterval);
};

TimingWorker.prototype.flush = function () {
  let self = this;
  let now = Date.now();
  self.lastFlush = now;

  setTimeout(self.flush.bind(self), self.flushInterval - now % self.flushInterval);

  self.events.emit('pushBackends', self.metrics);
  self.metrics = {};
};

TimingWorker.prototype.pushBackends = function (metrics) {
  let now = Date.now();
  // 将时间戳格式化为该分钟的30s
  let ts = Math.floor(((now / 1000 - 30) / 60)) * 60 + 30;

  let _sendFun = backend.send.bind(backend);

  _.each(metrics, function (metric) {
    metric.ts = ts;
    let _name = metric.name;
    let _metric = {
      ts: ts
    };

    _sendFun(_.defaults({
      name: _name + '.sum',
      value: metric.sum
    }, _metric));

    _sendFun(_.defaults({
      name: _name + '.min',
      value: metric.min
    }, _metric));

    _sendFun(_.defaults({
      name: _name + '.max',
      value: metric.max
    }, _metric));

    _sendFun(_.defaults({
      name: _name + '.count',
      value: metric.count
    }, _metric));

    _sendFun(_.defaults({
      name: _name + '.avg',
      value: metric.sum / metric.count
    }, _metric));
  });
};

TimingWorker.prototype.add = function (metrics) {
  let self = this;
  _.each(metrics, function (metric) {
    if (!_.isObject(metric)) {
      self._metricInvalidLog('metric is not dict', metric);
      return;
    }

    if (metric.type !== 'timing') {
      self._metricInvalidLog('metric type is not timing', metric);
      return;
    }

    if (!_.isNumber(metric.count)) {
      metric.count = 1;
    }

    metric.count = Math.floor(metric.count);

    if (metric.count <= 0) {
      return;
    }

    if (!_.isNumber(metric.sum)) {
      self._metricInvalidLog('metric sum is not number', metric);
      return;
    }

    if (metric.count === 1) {
      metric.min = metric.sum;
      metric.max = metric.sum;
    } else {
      if (!_.isNumber(metric.min)) {
        self._metricInvalidLog('metric min cannot empty', metric);
        return;
      }

      if (!_.isNumber(metric.max)) {
        self._metricInvalidLog('metric max is not number', metric);
        return;
      }
    }

    let _last = self.metrics[metric.name];
    if (_last) {
      metric.min = Math.min(_last.min, metric.min);
      metric.max = Math.max(_last.max, metric.max);
      metric.sum = _last.sum + metric.sum;
      metric.count = _last.count + metric.count;
    }

    self.metrics[metric.name] = metric;
  });
};

TimingWorker.prototype._metricInvalidLog = function (msg, metric) {
  LOG.warn({
    detail: {
      msg: msg,
      metric: metric
    }
  }, 'worker-timing-log');
};

module.exports = TimingWorker;
