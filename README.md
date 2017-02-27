# fast-locky
[![Build Status](https://travis-ci.org/JBustin/fast-locky.svg?branch=master)](https://travis-ci.org/JBustin/fast-locky)

Fast resource locking system based on redis.

## Install

Inherited from https://github.com/lemonde/locky.
Every methods work with collections, and the redis commands are pipelined to reduce network exchanges, to gain performances.
More cluster friendly because expire events are watched from redis instead of local memory.

```
npm install fast-locky
```

## Usage

```js
var Locky = require('fast-locky');

// Create a new locky client.
var locky = new Locky();

// Lock the resource 'article:12' with the locker 20.
locky.lock([{ resource: 'article:12', locker: 20 }]).then(...);

// Extends the lock TTL of the resource 'article:12'.
locky.extend(['article:12']).then(...);

// Unlock the resource 'article:12.
locky.unlock(['article:12']).then(...);

// Get the locker of the resource 'article:12'.
locky.getLockers(['article:12']).then(...);
```

### new Locky(options)

Create a new locky client with some options.

#### redis

Type: `Object` or `Function`

If you specify an **object**, the properties will be used to call `redis.createClient` method.

```js
new Locky({
  redis: {
    port: 6379,
    host: '127.0.0.1',
    connect_timeout: 200
  }
})
```

If you specify a **function**, it will be called to create redis clients.
You could use a then-redis connector (cf. https://github.com/mjackson/then-redis).

```js
var redis = require('then-redis');

new Locky({ redis: createClient })

function createClient() {
  var client = redis.createClient();
  client.select(1); // Choose a custom database.
  return client;
}
```

#### ttl

Type: `Number`

Define the expiration time of the lock in ms. Defaults to `null` (no expiration).

```js
new Locky({ ttl: 2000 })
```

### locky.lock(options, [callback])

Lock a resource for a locker.

If the resource was already locked,
you can't lock it but by passing `force: true`.

```js
locky
.lock([{
  resource: 'article:23',
  locker: 20
}], true)
.then((locked) => console.log(locked)); // true the lock has been taken
```

#### resource

Type: `String` | `Number`

Which resource would you like to lock.

#### locker

Type: `String` | `Number`

Which locker should lock the resource, can by any string.

#### force

Type: `Boolean`

Should we take a lock if it's already locked?

### locky.extend(resources, [callback])

Refresh the lock ttl of a resource, if the resource is not locked, do nothing.

```js
// Refresh the resource "article:23".
locky.extend(['article:23']).then(...);
```

### locky.unlock(resources, [callback])

Unlock a resource, if the resource is not locked, do nothing.

```js
// Unlock the resource "article:23".
locky.unlock(['article:23']).then(...);
```

### locky.getLockers(resources, [callback])

Return the locker of a resource, if the resource is not locked, return `null`.

```js
// Return the locker of the resource "article:23".
locky.getLocker(['article:23']).then(...);
```

### Events

#### "lock"

Emitted when a resource is locked.

```js
locky.on('lock', (resource, locker) => { ... });
```

#### "unlock"

Emitted when a resource is unlocked.

```js
locky.on('unlock', (resource) => { ... });
```

#### "expire"

Emitted when the lock on a resource has expired.

```js
locky.on('expire', (resource) => { ... });
```

#### "error"

Emitted when locky catches an error.

```js
locky.on('error', (error) => { ... });
```

## License

MIT
