const expect = require('chai').expect;
const sinon = require('sinon');
const Redis = require('../lib/redis');
const Locky = require('../lib/locky');

describe('Locky', () => {
  const name = 'test';

  beforeEach((done) => {
    const client = new Redis();

    client
    .exec({ cmd: 'keys', args: [`${name}:lock:*`] })
    .then((keys) => {
      if (! keys || ! keys.length) return Promise.resolve(true);
      return client.exec({ cmd: 'del', args: keys });
    })
    .then(() => {
      client.close();
      done();
    })
    .catch(done);
  });

  it('constructor instanciates a redis connection', () => {
    const locky = new Locky({ name });

    expect(!! locky.redis).to.be.true;

    locky.close();
  });

  it('constructor sets a default ttl to null value', () => {
    const locky = new Locky({ name });

    expect(locky.ttl).to.be.null;

    locky.close();
  });

  it('constructor sets a ttl with passed value', () => {
    const locky = new Locky({ ttl: 5000, name });

    expect(locky.ttl).to.equal(5000);

    locky.close();
  });

  it('constructor sets a default set name', () => {
    const locky = new Locky({ name });

    expect(locky.set).to.equal('test:lock:currents');

    locky.close();
  });

  it('constructor sets a set name with passed value', () => {
    const locky = new Locky({ set: 'coucou', name });

    expect(locky.set).to.equal('coucou');

    locky.close();
  });

  describe('actions', () => {
    let locky;

    beforeEach(() => {
      locky = new Locky({ ttl: 50, name });
      sinon.spy(locky, 'emit');
    });

    afterEach(() => {
      locky.emit.reset();
      locky.close();
    });

    it('locks resources', (done) => {
      locky.lock([
        { resource: 'article1', locker: 'user1' },
        { resource: 'article2', locker: 'user1' },
        { resource: 'article3', locker: 'user2' }
      ])
      .then(() => locky.getLocks())
      .then((locks) => {
        expect(locks.sort())
        .to.eql([
          'test:lock:resource:article1',
          'test:lock:resource:article2',
          'test:lock:resource:article3'
          ].sort()
        );

        expect(locky.emit.args).to.eql([
          ['lock', 'article1', 'user1'],
          ['lock', 'article2', 'user1'],
          ['lock', 'article3', 'user2']
        ]);

        done();
      })
      .catch(done);
    });

    it('locks force resources', (done) => {
      locky.lock([
        { resource: 'article1', locker: 'user1' },
        { resource: 'article2', locker: 'user1' },
        { resource: 'article3', locker: 'user2' }
      ], true)
      .then(() => locky.getLocks())
      .then((locks) => {
        expect(locks.sort())
        .to.eql([
          'test:lock:resource:article1',
          'test:lock:resource:article2',
          'test:lock:resource:article3'
          ].sort()
        );

        expect(locky.emit.args).to.eql([
          ['lock', 'article1', 'user1'],
          ['lock', 'article2', 'user1'],
          ['lock', 'article3', 'user2']
        ]);

        done();
      })
      .catch(done);
    });

    it('unlock resources', (done) => {
      locky.lock([
        { resource: 'article1', locker: 'user1' },
        { resource: 'article2', locker: 'user1' },
        { resource: 'article3', locker: 'user2' }
      ])
      .then(() => locky.unlock(['article1', 'article3']))
      .then(() => locky.getLocks())
      .then((locks) => {
        expect(locks.sort())
        .to.eql(['test:lock:resource:article2'].sort());

        expect(locky.emit.args.slice(3).sort()).to.eql([
          ['unlock', 'article1'],
          ['unlock', 'article3']
        ].sort());

        done();
      })
      .catch(done);
    });

    it('get lockers', (done) => {
      locky.lock([
        { resource: 'article1', locker: 'user1' },
        { resource: 'article2', locker: 'user2' },
        { resource: 'article3', locker: 'user3' },
        { resource: 'article4', locker: 'user3' }
      ])
      .then(() => locky.getLockers(['article1', 'article3', 'article4', 'article5']))
      .then((lockers) => {
        expect(lockers.sort())
        .to.eql(['user1', 'user3', 'user3', null].sort());
        done();
      })
      .catch(done);
    });

    it('extends lock', (done) => {
      locky.lock([
        { resource: 'article1', locker: 'user1' },
        { resource: 'article2', locker: 'user1' },
        { resource: 'article3', locker: 'user2' }
      ])
      .then(() => locky.getLocks())
      .then((locks) => locky.extend(locks))
      .then(() => locky.getLocks())
      .then((locks) => {
        expect(locks.sort()).to.eql([
          'test:lock:resource:article1',
          'test:lock:resource:article2',
          'test:lock:resource:article3'
        ].sort());

        return new Promise(resolve => {
          setTimeout(() => resolve(true), 100);
        });
      })
      .then(() => locky.getLocks())
      .then((locks) => {
        expect(locks).to.eql([]);
        done();
      })
      .catch(done);
    });

    it('catches expires locks', (done) => {
      locky.lock([
        { resource: 'article1', locker: 'user1' },
        { resource: 'article2', locker: 'user1' },
        { resource: 'article3', locker: 'user2' }
      ])
      .then(() => {
        setTimeout(() => {
          expect(locky.emit.args.slice(3).sort()).to.eql([
            ['expire', 'article1'],
            ['expire', 'article2'],
            ['expire', 'article3']
          ]);
          done();
        }, 100);
      })
      .catch(done);
    });
  });
});
