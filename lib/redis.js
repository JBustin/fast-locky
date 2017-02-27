const redis = require('then-redis');
const _ = require('lodash');

class Redis {
  constructor(options) {
    if (_.isFunction(options)) {
      this.client = options();
      return;
    }

    this.client = redis.createClient(options);
  }

  exec(op) {
    return this.client[op.cmd](...op.args);
  }

  multi(ops) {
    this.client.multi();

    ops.forEach((op) => this.exec(op));

    return this.client.exec();
  }

  close() {
    return this.client.quit();
  }
}

module.exports = Redis;
