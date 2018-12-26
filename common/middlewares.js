const _ = require('lodash');
const LOG = require('./logger');

exports.respAsJsonOrJsonp = respAsJsonOrJsonp;
exports.accessLog = accessLog;

async function respAsJsonOrJsonp(ctx, next) {
  let body = {};
  try {
    let data = await next();
    body = {
      errcode: 0,
      data: _.isUndefined(data) ? null : data,
      message: ''
    };
  } catch (error) {
    if (error.name !== 'InputError') {
      LOG.error({
        ctx: ctx,
        error: error
      }, 'System Error');
    } else {
      LOG.warn({
        ctx: ctx,
        error: error
      }, 'Input Error');
    }

    body = {
      errcode: error.status || 500,
      data: null,
      message: error.message
    };
  }

  let callback = ctx.query.callback;
  if (callback) {
    ctx.type = 'js';
    ctx.body = _.template('<%=callback%>(<%=result%>)')({
      callback: callback,
      result: JSON.stringify(body)
    });
  } else {
    ctx.type = 'json';
    ctx.body = JSON.stringify(body);
  }
};

async function accessLog(ctx, next) {
  let startTime = new Date();
  await next();
  if (ctx.url !== '/healthcheck.html' && ctx.url !== '/ping') {
    let duration = new Date() - startTime;
    LOG.info({
      status: ctx.response.status,
      access: true,
      ip: ctx.ip.replace(/^.*([:]+)/, ''),
      duration: duration
    }, ctx.url);
  }
};