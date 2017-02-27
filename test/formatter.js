const expect = require('chai').expect;
const Formatter = require('../lib/formatter');

describe('Formatters', () => {
  let formatter;

  describe('With name', () => {
    before(() => formatter = new Formatter('test'));

    it(
      'should format resourceToLock',
      () => expect(formatter.resourceToLock('a123')).to.equal('test:lock:resource:a123')
    );

    it(
      'should parse lockToResource',
      () => expect(formatter.lockToResource('test:lock:resource:a123')).to.equal('a123')
    );

    it(
      'should format set name',
      () => expect(formatter.formatSetName()).to.equal('test:lock:currents')
    );
  });

  describe('Without name', () => {
    before(() => formatter = new Formatter());

    it(
      'should format resourceToLock',
      () => expect(formatter.resourceToLock('a123')).to.equal('lock:resource:a123')
    );

    it(
      'should parse lockToResource',
      () => expect(formatter.lockToResource('lock:resource:a123')).to.equal('a123')
    );

    it(
      'should format set name',
      () => expect(formatter.formatSetName()).to.equal('lock:currents')
    );
  });

});
