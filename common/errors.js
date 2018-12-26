const util = require('util');

exports.InputError = InputError;
exports.SystemError = SystemError;

function InputError(message) {
  Error.call(this);
  Error.captureStackTrace(this);
  this.message = message || 'Input Error';
  this.status = 400;
  this.name = 'InputError';
}

util.inherits(InputError, Error);

function SystemError(message) {
  Error.call(this);
  Error.captureStackTrace(this);
  this.message = message || 'System Error';
  this.status = 500;
  this.name = 'SystemError';
}

util.inherits(SystemError, Error);
