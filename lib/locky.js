const EventEmitter = require('events');
const _ = require('lodash');
const Redis = require('./redis');
const Formatter = require('./formatter');

class Locky extends EventEmitter {

  /**
   * Constructor
   *
   * @param {options|number} options.ttl in milliseconds
   * @param {options|string} options.set name to store currents locks to extend
   * @param {options|object|function} options.redis redis client or redis connection parameters
   */

  constructor(options) {
    super();

    const locky = this;

    this.redis = new Redis(_.get(options, 'redis'));
    this.formatter = new Formatter(_.get(options, 'name'));

    this.ttl = _.get(options, 'ttl', null);
    this.set = _.get(options, 'set', this.formatter.formatSetName());
    this.locks = {};

    this.expirelocksInterval = setInterval(
      () => locky.getLocks().then((locks) => locky.expireLocks(locks)),
      this.ttl / 2
    );
  }

  /**
   * Lock resources with lockers
   *
   * @param {[Object]} collection of { resource, locker }
   * @param {boolean} force
   */

  lock(collection, force) {
    const locky = this;
    const ops = _(collection)
    .map(({ resource, locker }) => ([{
      cmd: 'sadd', args: [locky.set, this.formatter.resourceToLock(resource)]
    }, {
      cmd: force ? 'set' : 'setnx', args: [this.formatter.resourceToLock(resource), locker]
    }]))
    .flatten()
    .value();

    return this.redis.multi(ops)
    .then((results) => {
      _(collection)
      .zipWith(
        results.filter((row, index) => index % 2), // don't keep odd rows which are sadd results
        ({ resource, locker }, result) => result ? { resource, locker } : null
      )
      .compact()
      .forEach(({ resource, locker }) => {
        locky.emit('lock', resource, locker);
      });

      return true;
    })
    .catch((err) => this.error(err));
  }

  /**
   * Unlock resources
   *
   * @param {[Object]} collection of resources
   */

  unlock(resources) {
    const locky = this;
    const ops = _(resources)
    .map((resource) => ([{
      cmd: 'srem', args: [locky.set, this.formatter.resourceToLock(resource)]
    }, {
      cmd: 'del', args: [this.formatter.resourceToLock(resource)]
    }]))
    .flatten()
    .value();

    return this.redis.multi(ops)
    .then((results) => {
      _(resources)
      .zipWith(
        results.filter((row, index) => index % 2), // don't keep odd rows which are sadd results
        (resource, result) => result ? resource : null
      )
      .compact()
      .forEach((resource) => {
        locky.emit('unlock', resource);
      });

      return true;
    })
    .catch((err) => this.error(err));
  }

  /**
   * Get current locked resources
   */

  getLocks() {
    const ops = {
      cmd: 'smembers',
      args: [this.set]
    };

    return this.redis.exec(ops)
    .catch((err) => this.error(err));
  }

  /**
   * Get lockers of resources
   */

  getLockers(resources) {
    const ops = resources.map((resource) => ({
      cmd: 'get',
      args: [this.formatter.resourceToLock(resource)]
    }));

    return this.redis.multi(ops)
    .catch((err) => this.error(err));
  }

  /**
   * Extend resources, specially if locks have an expire ttl
   *
   * @param {[Object]} collection of locks
   */

  extend(resources) {
    if (! this.ttl) return;

    const locky = this;
    const ops = resources
    .map((resource) => ({
      cmd: 'expire',
      args: [this.formatter.resourceToLock(resource), locky.ttl]
    }));

    return this.redis.multi(ops)
    .then((results) => {
      const extended = _(resources)
      .zipWith(results, (resource, result) => result === 1 ? resource : null)
      .compact()
      .value();

      extended.forEach((resource) => {
        locky.emit('extend', resource);
      });

      return true;
    })
    .catch((err) => this.error(err));
  }

  /**
   * Listen locks, specially if locks have an expire ttl
   *
   * @param {[Object]} collection of locks
   */

  expireLocks(locks) {
    if (! this.ttl) return;

    const locky = this;
    const ops = locks.map((lock) => ({
      cmd: 'ttl',
      args: [lock]
    }));

    return this.redis.multi(ops)
    .then((results) => {
      const expired = _(locks)
      .zipWith(results, (lock, result) => result < 0 ? this.formatter.lockToResource(lock) : null)
      .compact()
      .value();

      expired.forEach((resource) => {
        locky.emit('expire', resource);
      });

      const ops = expired.map((resource) => ({
        cmd: 'srem',
        args: [locky.set, this.formatter.resourceToLock(resource)]
      }));

      return locky.redis.multi(ops);
    })
    .catch((err) => this.error(err));
  }

  /**
   * Shut down the service
   */

  close() {
    clearInterval(this.expirelocksInterval);
    return this.redis.close();
  }

  /**
   * Emit error message
   */
  error(err) {
    this.emit('error', err);
  }
}

module.exports = Locky;
