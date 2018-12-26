const _ = require('lodash');
const workers = require('./dev.instances.conf').workers;

module.exports = {
  apps: _.chain(workers).map(function(ins){
    return {
      name: `metric_worker_${ins.type}_${ins.port}`,
      script: './index.js',
      args: `-c ./dev.instances.conf.js -i metric_worker_${ins.type}_${ins.port}`,
      watch: true
    };
  }).value()
};
