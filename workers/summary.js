const events = require('events');

const _ = require('lodash');
const TDigest = require('tdigest').TDigest;
const LOG = require('../common/logger');

const backend = require('../backends/backend');

function SummaryWorker(options) {
  if (!(this instanceof SummaryWorker)) {
    return new SummaryWorker(options);
  }
  this.reset();
}

SummaryWorker.prototype.reset = function () {
  let self = this;
  self.metrics = {};

  self.events = new events.EventEmitter();
  self.events.on('pushBackends', self.pushBackends);

  self.flushInterval = 1000 * 60;
  setTimeout(self.flush.bind(self), self.flushInterval - Date.now() % self.flushInterval);
};

SummaryWorker.prototype.flush = function () {
  let self = this;
  let now = Date.now();
  self.lastFlush = now;

  setTimeout(self.flush.bind(self), self.flushInterval - now % self.flushInterval);

  self.events.emit('pushBackends', self.metrics);
  self.metrics = {};
};

SummaryWorker.prototype.pushBackends = function (metrics) {
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

    let output = metric.output || {};

    output.common = output.common.length ? output.common : ['min', 'max', 'count'];
    output.percentiles = output.percentiles.length ? output.percentiles : [50, 90, 95, 99];

    let _td = metric.tdigest;
    _td.compress();

    _.each(output.common, function (_type) {
      switch (_type) {
        case 'min':
          _sendFun(_.defaults({
            name: _name + '.min',
            value: _td.percentile(0)
          }, _metric));
          break;
        case 'max':
          _sendFun(_.defaults({
            name: _name + '.max',
            value: _td.percentile(100)
          }, _metric));
          break;
        case 'count':
          _sendFun(_.defaults({
            name: _name + '.count',
            value: _td.n
          }, _metric));
          break;
        case 'sum':
          _sendFun(_.defaults({
            name: _name + '.sum',
            value: _.reduce(_td.toArray(), function (res, centroid) {
              return res + centroid.mean * centroid.n;
            }, 0)
          }, _metric));
          break;
        case 'avg':
          _sendFun(_.defaults({
            name: _name + '.avg',
            value: _.reduce(_td.toArray(), function (res, centroid) {
              return res + centroid.mean * centroid.n;
            }, 0) / _td.n
          }, _metric));
          break;
        default:
      }
    });

    _.each(output.percentiles, function (_p) {
      if (_.isNumber(_p) && _p >= 0 && _p <= 100) {
        _p = Math.floor(_p);
        _sendFun(_.defaults({
          name: _name + '.p' + _p,
          value: _td.percentile(_p / 100)
        }, _metric));
      }
    });

  });
};

SummaryWorker.prototype.add = function (metrics) {
  let self = this;
  _.each(metrics, function (metric) {
    if (!_.isObject(metric)) {
      self._metricInvalidLog('metric is not dict', metric);
      return;
    }

    if (metric.type !== 'summary') {
      self._metricInvalidLog('metric type is not summary', metric);
      return;
    }

    let samplePairs = [];

    if (metric.data_type === 'raw') {
      if (!_.isNumber(metric.value)) {
        self._metricInvalidLog(
          'metric value cannot be empty or non-numeric when data_type is raw', metric);
        return;
      }

      if (!_.isNumber(metric.count)) {
        self._metricInvalidLog(
          'metric count cannot be empty or non-numeric when data_type is raw', metric);
        return;
      }

      metric.count = Math.floor(metric.count);
      if (metric.count <= 0) {
        self._metricInvalidLog(
          'metric count cannot be smaller than 1  when data_type is raw', metric);
        return;
      }

      samplePairs.push({
        mean: metric.value,
        count: metric.count
      });

    } else if (metric.data_type === 'tdigest') {
      let _str = metric.value;
      if (!_.isString(_str)) {
        self._metricInvalidLog(
          'metric value must be string when data_type is tdigest', metric);
        return;
      }
      _str = _.trim(_str.replace(/\s/g, ''), '~');
      let ss = _str.split('~');
      let _len = ss.length;
      if (_len % 2 !== 0) {
        self._metricInvalidLog(
          'metric value invalid when data_type is tdigest', metric);
        return;
      }
      for (let i = 0; i < _len / 2; i++) {
        let _mean = parseFloat(ss[2 * i]);
        let _count = parseFloat(ss[2 * i + 1]);
        if (!_.isNumber(_mean)) {
          self._metricInvalidLog(
            'metric value meanN must be numeric when data_type is tdigest', metric);
          return;
        }

        if (!_.isNumber(_count)) {
          self._metricInvalidLog(
            'metric value countN must be numeric when data_type is tdigest', metric);
          return;
        }
        _count = Math.floor(_count);

        if (_count <= 0) {
          self._metricInvalidLog(
            'metric value countN cannot be smaller than 1  when data_type is tdigest', metric);
          return;
        }
        samplePairs.push({
          mean: _mean,
          count: _count
        });
      }
    } else {
      self._metricInvalidLog('metric data_type must be raw or tdigest', metric);
      return;
    }

    metric.output = _.isObject(metric.output) ? metric.output : {};
    metric.output.common = _.isArray(metric.output.common) ? metric.output.common : [];
    metric.output.percentiles = _.isArray(metric.output.percentiles) ? metric.output.percentiles : [];


    let _last = self.metrics[metric.name];
    if (!_last) {
      _last = metric;
      self.metrics[metric.name] = _last;
      _last.tdigest = new TDigest();
    } else {
      _last.output.common = _.chain(_last.output.common).concat(metric.output.common).uniq().value();
      _last.output.percentiles = _.chain(_last.output.percentiles).concat(metric.output.percentiles).uniq().value();
    }

    _.each(samplePairs, function (sample) {
      _last.tdigest.push(sample.mean, sample.count);
    });
  });
};

SummaryWorker.prototype._metricInvalidLog = function (msg, metric) {
  LOG.warn({
    detail: {
      msg: msg,
      metric: metric
    }
  }, 'worker-summary-log');
};

module.exports = SummaryWorker;
