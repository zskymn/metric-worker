const _ = require('lodash');
const getopts = require('getopts');

const defaults = {
  log: {
    level: 'info'
  },
  carbonRelayHost: '<domain of graphite>',
  carbonRelayPort: 2013,
  healthcheckFile: './healthcheck.html'
};

function getConfig() {
  let options = getopts(process.argv.slice(2));

  let config = require(options.c).configs[options.i];
  let conf = _.defaultsDeep({}, config, defaults);
  conf.log.name = conf.log.name || options.i;
  conf.instanceName = options.i;
  return conf;
}

module.exports = getConfig();
