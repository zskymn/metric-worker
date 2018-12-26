const fs = require('fs');
const Koa = require('koa');
const Router = require('koa-router');
const bodyparser = require('koa-bodyparser');

const CONF = require('./conf');
const LOG = require('./common/logger');
const mws = require('./common/middlewares');

const worker = require('./workers/' + CONF.type)();

function run() {

  let app = new Koa();
  app.use(mws.accessLog);
  app.use(bodyparser({
    jsonLimit: '50mb'
  }));

  // router
  let router = getRouter();
  app.use(router.routes(), router.allowedMethods());

  app.on('error', function (err, ctx) {
    if (err.code !== 'ECONNABORTED' && err.code !== 'HPE_INVALID_EOF_STATE') {
      LOG.error({
        error: err,
        ctx: ctx
      }, 'System Error');
    } else {
      LOG.warn({
        error: err,
        ctx: ctx
      }, 'Input Error');
    }
  });

  app.listen(CONF.port || 9090);

}

function getRouter() {
  let router = Router();
  router.get('/',
    async (ctx) => {
      ctx.body = `welcome to metric worker of ${CONF.type}`;
    });

  router.get('/healthcheck.html',
    async (ctx) => {
      if (fs.existsSync(CONF.healthcheckFile)) {
        ctx.body = 'ok';
      } else {
        ctx.status = 404;
      }
    });

  router.post('/metric/push',
    async (ctx) => {
      worker.add(ctx.request.body.metrics);
      ctx.body = 'metric push ok';
    });

  return router;
}

run();
