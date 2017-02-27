const _ = require('lodash');

class Formatter {
  constructor(name) {
    this.name = name;
  }

  /**
   * Format a resource key.
   *
   * @param {String} resource
   * @returns {String} lock
   */

  resourceToLock(resource) {
    return _([this.name, 'lock', 'resource', resource])
    .compact()
    .join(':');
  }

  /**
   * Parse a lock key.
   *
   * @param {String} lock
   * @returns {String} resource
   */

  lockToResource(lock) {
    const regStr = _([this.name, 'lock', 'resource'])
    .compact()
    .join(':');

    return lock.replace(new RegExp(`${regStr}:`, 'mg'), '');
  }

  /**
   * Format set name.
   *
   * @returns {String} set name
   */

   formatSetName() {
    return _([this.name, 'lock', 'currents'])
    .compact()
    .join(':');
   }
}


/**
 * Expose module.
 */

module.exports = Formatter;
