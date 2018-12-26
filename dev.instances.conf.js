const _ = require('lodash');

const workers = [{
  type: 'set',
  port: 7100
}, {
  type: 'set',
  port: 7101
}, {
  type: 'counter',
  port: 7200
}, {
  type: 'timing',
  port: 7300
}, {
  type: 'summary',
  port: 7400
}];

const configs = _.chain(workers)
  .map(function (ins) {
    return [
      `metric_worker_${ins.type}_${ins.port}`,
      {
        type: ins.type,
        port: ins.port,
        log: {}
      }
    ];
  }).fromPairs().value();


exports.workers = workers;
exports.configs = configs;