const net = require('net');
const _ = require('lodash');

const LOG = require('../common/logger');
const CONF = require('../conf');

const host = CONF.carbonRelayHost;
const port = CONF.carbonRelayPort;

exports.push = push;

function push(metrics) {
  let payload = _genPayload(metrics);

  try {
    let client = net.createConnection(port, host);
    client.on('error', function (err) {
      LOG.error({
        error: err
      }, 'push-metrics-to-carbon-relay-error');
    });
    client.on('connect', function () {
      client.write(payload);
      client.end();
    });
  } catch (err) {
    LOG.error({
      error: err
    }, 'push-metrics-to-carbon-relay-error');
  }
}

function _genPayload(metrics) {
  return _.chain(metrics).map(function (metric) {
    return `${metric.name} ${metric.value} ${metric.ts}`;
  }).value().join('\n') + '\n';;
}
