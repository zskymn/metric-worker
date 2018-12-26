# metric-worker

metric-worker 接收来自 metric-gateway 的数据，完成指标的聚合计算和推送工作

## NodeJS 版本

确保 `NodeJS` 版本大于 `8.9.0`

检查版本

```bash
node -v
```

更新node版本方法

```bash
sudo npm install -g n  # n是一个方便的node版本管理工具
n 8.9.0  # 安装8.9.0版的nodejs
npm -v # 重新检查版本，若版本为改变，可以执行 source ~/.bashrc
```

## 开发

```sh
$ npm install

# 启动（监视代码改变，自动重启）
$ sudo pm2 start dev.pm2.config.js

# 删除
$ sudo pm2 delete dev.pm2.config.js

# 查看日志
$ sudo pm2 logs dev.pm2.config.js
```

## 线上

```sh
$ npm i --production

# 启动
$ sudo pm2 start prod.pm2.config.js

# 重启
$ sudo pm2 restart prod.pm2.config.js

# 关闭
$ sudo pm2 stop prod.pm2.config.js

# 删除
$ sudo pm2 delete prod.pm2.config.js
```

## 测试

```sh
# 开发中测试（watch代码改变）
$ npm test

# 代码测试覆盖率
$ npm run coverage
```

## 接口

/healthcheck.html

判断服务是否存在的接口，主要供NG调用


/metric/push

接收外部push数据的接口，本项目提供服务的主要接口