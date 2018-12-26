const bunyan = require('bunyan');
const CONF = require('../conf');

module.exports = bunyan.createLogger(CONF.log);
