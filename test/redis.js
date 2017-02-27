const expect = require('chai').expect;
const _ = require('lodash');
const sinon = require('sinon');
const redis = require('then-redis');
const Redis = require('../lib/redis');

let client, multi, get, exec;

describe('Redis', () => {
  beforeEach(() => {
    multi = sinon.spy();
    get = sinon.spy();
    exec = () => Promise.resolve(true);

    redis.createClient = sinon.stub().returns({ multi, get, exec });
  });

  afterEach(() => {
    multi.reset();
    get.reset();
    redis.createClient.reset();
  });

  it('constructor instanciantes redis connection from parameters', () => {
    client = new Redis({ hostname: 'localhost', port: 6388 });

    expect(redis.createClient.called).to.be.true;
    expect(redis.createClient.args).to.eql([
      [{ hostname: 'localhost', port: 6388 }]
    ]);
  });

  it('constructor uses a connection passed as parameters', () => {
    client = new Redis(_.partial(redis.createClient));

    expect(redis.createClient.called).to.be.true;
  });

  it('multi executs commands', (done) => {
    const myRedis = new Redis();

    myRedis
    .multi([
      { cmd: 'get', args: [1] },
      { cmd: 'get', args: [2] }
    ])
    .then(() => {
      expect(get.args).to.eql([
        [1], [2]
      ]);
      done();
    })
    .catch(done);
  });
});

