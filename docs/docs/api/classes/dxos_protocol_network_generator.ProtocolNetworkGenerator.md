# Class: ProtocolNetworkGenerator

[@dxos/protocol-network-generator](../modules/dxos_protocol_network_generator.md).ProtocolNetworkGenerator

## Hierarchy

- `NetworkGenerator`

- `EventEmitter`

  ↳ **`ProtocolNetworkGenerator`**

## Constructors

### constructor

**new ProtocolNetworkGenerator**(`createPeer`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `createPeer` | `CreatePeerCallback` |

#### Inherited from

NetworkGenerator.constructor

#### Defined in

[packages/mesh/protocol-network-generator/src/protocol-network-generator.ts:36](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-network-generator/src/protocol-network-generator.ts#L36)

## Properties

### \_createPeer

 `Private` **\_createPeer**: `CreatePeerCallback`

#### Defined in

[packages/mesh/protocol-network-generator/src/protocol-network-generator.ts:34](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-network-generator/src/protocol-network-generator.ts#L34)

___

### balancedBinTree

 **balancedBinTree**: `Generator`

#### Inherited from

NetworkGenerator.balancedBinTree

___

### circularLadder

 **circularLadder**: `Generator`

#### Inherited from

NetworkGenerator.circularLadder

___

### cliqueCircle

 **cliqueCircle**: `Generator`

#### Inherited from

NetworkGenerator.cliqueCircle

___

### complete

 **complete**: `Generator`

#### Inherited from

NetworkGenerator.complete

___

### completeBipartite

 **completeBipartite**: `Generator`

#### Inherited from

NetworkGenerator.completeBipartite

___

### error

 `Readonly` **error**: `Event`<`Error`\>

#### Inherited from

NetworkGenerator.error

#### Defined in

packages/mesh/network-generator/dist/src/network-generator.d.ts:9

___

### grid

 **grid**: `Generator`

#### Inherited from

NetworkGenerator.grid

___

### grid3

 **grid3**: `Generator`

#### Inherited from

NetworkGenerator.grid3

___

### ladder

 **ladder**: `Generator`

#### Inherited from

NetworkGenerator.ladder

___

### noLinks

 **noLinks**: `Generator`

#### Inherited from

NetworkGenerator.noLinks

___

### path

 **path**: `Generator`

#### Inherited from

NetworkGenerator.path

___

### wattsStrogatz

 **wattsStrogatz**: `Generator`

#### Inherited from

NetworkGenerator.wattsStrogatz

___

### captureRejectionSymbol

 `Static` `Readonly` **captureRejectionSymbol**: typeof [`captureRejectionSymbol`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md#capturerejectionsymbol)

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:273

___

### captureRejections

 `Static` **captureRejections**: `boolean`

Sets or gets the default captureRejection value for all emitters.

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:278

___

### defaultMaxListeners

 `Static` **defaultMaxListeners**: `number`

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:279

___

### errorMonitor

 `Static` `Readonly` **errorMonitor**: typeof [`errorMonitor`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md#errormonitor)

This symbol shall be used to install a listener for only monitoring `'error'`
events. Listeners installed using this symbol are called before the regular
`'error'` listeners are called.

Installing a listener using this symbol does not change the behavior once an
`'error'` event is emitted, therefore the process will still crash if no
regular `'error'` listener is installed.

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:272

## Methods

### \_generate

**_generate**(`topology`, `options?`): `Promise`<`Network`\>

Generate a network based on a ngraph.generator topology

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `topology` | ``"ladder"`` \| ``"complete"`` \| ``"completeBipartite"`` \| ``"balancedBinTree"`` \| ``"path"`` \| ``"circularLadder"`` \| ``"grid"`` \| ``"grid3"`` \| ``"noLinks"`` \| ``"cliqueCircle"`` \| ``"wattsStrogatz"`` | Valid ngraph.generator topology |
| `options` | `GenerateOptions` | - |

#### Returns

`Promise`<`Network`\>

#### Defined in

[packages/mesh/protocol-network-generator/src/protocol-network-generator.ts:56](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-network-generator/src/protocol-network-generator.ts#L56)

___

### addListener

**addListener**(`eventName`, `listener`): [`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

Alias for `emitter.on(eventName, listener)`.

**`Since`**

v0.1.26

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:299

___

### createTopology

**createTopology**(`topology`, ...`args`): `Promise`<`Network`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `topology` | ``"ladder"`` \| ``"complete"`` \| ``"completeBipartite"`` \| ``"balancedBinTree"`` \| ``"path"`` \| ``"circularLadder"`` \| ``"grid"`` \| ``"grid3"`` \| ``"noLinks"`` \| ``"cliqueCircle"`` \| ``"wattsStrogatz"`` |
| `...args` | `any` |

#### Returns

`Promise`<`Network`\>

#### Inherited from

NetworkGenerator.createTopology

#### Defined in

packages/mesh/network-generator/dist/src/network-generator.d.ts:12

___

### emit

**emit**(`eventName`, ...`args`): `boolean`

Synchronously calls each of the listeners registered for the event named`eventName`, in the order they were registered, passing the supplied arguments
to each.

Returns `true` if the event had listeners, `false` otherwise.

```js
const EventEmitter = require('events');
const myEmitter = new EventEmitter();

// First listener
myEmitter.on('event', function firstListener() {
  console.log('Helloooo! first listener');
});
// Second listener
myEmitter.on('event', function secondListener(arg1, arg2) {
  console.log(`event with parameters ${arg1}, ${arg2} in second listener`);
});
// Third listener
myEmitter.on('event', function thirdListener(...args) {
  const parameters = args.join(', ');
  console.log(`event with parameters ${parameters} in third listener`);
});

console.log(myEmitter.listeners('event'));

myEmitter.emit('event', 1, 2, 3, 4, 5);

// Prints:
// [
//   [Function: firstListener],
//   [Function: secondListener],
//   [Function: thirdListener]
// ]
// Helloooo! first listener
// event with parameters 1, 2 in second listener
// event with parameters 1, 2, 3, 4, 5 in third listener
```

**`Since`**

v0.1.26

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` \| `symbol` |
| `...args` | `any`[] |

#### Returns

`boolean`

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:555

___

### eventNames

**eventNames**(): (`string` \| `symbol`)[]

Returns an array listing the events for which the emitter has registered
listeners. The values in the array are strings or `Symbol`s.

```js
const EventEmitter = require('events');
const myEE = new EventEmitter();
myEE.on('foo', () => {});
myEE.on('bar', () => {});

const sym = Symbol('symbol');
myEE.on(sym, () => {});

console.log(myEE.eventNames());
// Prints: [ 'foo', 'bar', Symbol(symbol) ]
```

**`Since`**

v6.0.0

#### Returns

(`string` \| `symbol`)[]

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:614

___

### getMaxListeners

**getMaxListeners**(): `number`

Returns the current max listener value for the `EventEmitter` which is either
set by `emitter.setMaxListeners(n)` or defaults to [defaultMaxListeners](dxos_protocol_network_generator.ProtocolNetworkGenerator.md#defaultmaxlisteners).

**`Since`**

v1.0.0

#### Returns

`number`

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:471

___

### listenerCount

**listenerCount**(`eventName`): `number`

Returns the number of listeners listening to the event named `eventName`.

**`Since`**

v3.2.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` \| `symbol` | The name of the event being listened for |

#### Returns

`number`

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:561

___

### listeners

**listeners**(`eventName`): `Function`[]

Returns a copy of the array of listeners for the event named `eventName`.

```js
server.on('connection', (stream) => {
  console.log('someone connected!');
});
console.log(util.inspect(server.listeners('connection')));
// Prints: [ [Function] ]
```

**`Since`**

v0.1.26

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` \| `symbol` |

#### Returns

`Function`[]

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:484

___

### off

**off**(`eventName`, `listener`): [`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

Alias for `emitter.removeListener()`.

**`Since`**

v10.0.0

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:444

___

### on

**on**(`eventName`, `listener`): [`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

Adds the `listener` function to the end of the listeners array for the
event named `eventName`. No checks are made to see if the `listener` has
already been added. Multiple calls passing the same combination of `eventName`and `listener` will result in the `listener` being added, and called, multiple
times.

```js
server.on('connection', (stream) => {
  console.log('someone connected!');
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

By default, event listeners are invoked in the order they are added. The`emitter.prependListener()` method can be used as an alternative to add the
event listener to the beginning of the listeners array.

```js
const myEE = new EventEmitter();
myEE.on('foo', () => console.log('a'));
myEE.prependListener('foo', () => console.log('b'));
myEE.emit('foo');
// Prints:
//   b
//   a
```

**`Since`**

v0.1.101

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` \| `symbol` | The name of the event. |
| `listener` | (...`args`: `any`[]) => `void` | The callback function |

#### Returns

[`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:330

___

### once

**once**(`eventName`, `listener`): [`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

Adds a **one-time**`listener` function for the event named `eventName`. The
next time `eventName` is triggered, this listener is removed and then invoked.

```js
server.once('connection', (stream) => {
  console.log('Ah, we have our first user!');
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

By default, event listeners are invoked in the order they are added. The`emitter.prependOnceListener()` method can be used as an alternative to add the
event listener to the beginning of the listeners array.

```js
const myEE = new EventEmitter();
myEE.once('foo', () => console.log('a'));
myEE.prependOnceListener('foo', () => console.log('b'));
myEE.emit('foo');
// Prints:
//   b
//   a
```

**`Since`**

v0.3.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` \| `symbol` | The name of the event. |
| `listener` | (...`args`: `any`[]) => `void` | The callback function |

#### Returns

[`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:359

___

### prependListener

**prependListener**(`eventName`, `listener`): [`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

Adds the `listener` function to the _beginning_ of the listeners array for the
event named `eventName`. No checks are made to see if the `listener` has
already been added. Multiple calls passing the same combination of `eventName`and `listener` will result in the `listener` being added, and called, multiple
times.

```js
server.prependListener('connection', (stream) => {
  console.log('someone connected!');
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

**`Since`**

v6.0.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` \| `symbol` | The name of the event. |
| `listener` | (...`args`: `any`[]) => `void` | The callback function |

#### Returns

[`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:579

___

### prependOnceListener

**prependOnceListener**(`eventName`, `listener`): [`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

Adds a **one-time**`listener` function for the event named `eventName` to the_beginning_ of the listeners array. The next time `eventName` is triggered, this
listener is removed, and then invoked.

```js
server.prependOnceListener('connection', (stream) => {
  console.log('Ah, we have our first user!');
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

**`Since`**

v6.0.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` \| `symbol` | The name of the event. |
| `listener` | (...`args`: `any`[]) => `void` | The callback function |

#### Returns

[`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:595

___

### rawListeners

**rawListeners**(`eventName`): `Function`[]

Returns a copy of the array of listeners for the event named `eventName`,
including any wrappers (such as those created by `.once()`).

```js
const emitter = new EventEmitter();
emitter.once('log', () => console.log('log once'));

// Returns a new Array with a function `onceWrapper` which has a property
// `listener` which contains the original listener bound above
const listeners = emitter.rawListeners('log');
const logFnWrapper = listeners[0];

// Logs "log once" to the console and does not unbind the `once` event
logFnWrapper.listener();

// Logs "log once" to the console and removes the listener
logFnWrapper();

emitter.on('log', () => console.log('log persistently'));
// Will return a new Array with a single function bound by `.on()` above
const newListeners = emitter.rawListeners('log');

// Logs "log persistently" twice
newListeners[0]();
emitter.emit('log');
```

**`Since`**

v9.4.0

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` \| `symbol` |

#### Returns

`Function`[]

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:514

___

### removeAllListeners

**removeAllListeners**(`event?`): [`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

Removes all listeners, or those of the specified `eventName`.

It is bad practice to remove listeners added elsewhere in the code,
particularly when the `EventEmitter` instance was created by some other
component or module (e.g. sockets or file streams).

Returns a reference to the `EventEmitter`, so that calls can be chained.

**`Since`**

v0.1.26

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `string` \| `symbol` |

#### Returns

[`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:455

___

### removeListener

**removeListener**(`eventName`, `listener`): [`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

Removes the specified `listener` from the listener array for the event named`eventName`.

```js
const callback = (stream) => {
  console.log('someone connected!');
};
server.on('connection', callback);
// ...
server.removeListener('connection', callback);
```

`removeListener()` will remove, at most, one instance of a listener from the
listener array. If any single listener has been added multiple times to the
listener array for the specified `eventName`, then `removeListener()` must be
called multiple times to remove each instance.

Once an event is emitted, all listeners attached to it at the
time of emitting are called in order. This implies that any`removeListener()` or `removeAllListeners()` calls _after_ emitting and_before_ the last listener finishes execution will
not remove them from`emit()` in progress. Subsequent events behave as expected.

```js
const myEmitter = new MyEmitter();

const callbackA = () => {
  console.log('A');
  myEmitter.removeListener('event', callbackB);
};

const callbackB = () => {
  console.log('B');
};

myEmitter.on('event', callbackA);

myEmitter.on('event', callbackB);

// callbackA removes listener callbackB but it will still be called.
// Internal listener array at time of emit [callbackA, callbackB]
myEmitter.emit('event');
// Prints:
//   A
//   B

// callbackB is now removed.
// Internal listener array [callbackA]
myEmitter.emit('event');
// Prints:
//   A
```

Because listeners are managed using an internal array, calling this will
change the position indices of any listener registered _after_ the listener
being removed. This will not impact the order in which listeners are called,
but it means that any copies of the listener array as returned by
the `emitter.listeners()` method will need to be recreated.

When a single function has been added as a handler multiple times for a single
event (as in the example below), `removeListener()` will remove the most
recently added instance. In the example the `once('ping')`listener is removed:

```js
const ee = new EventEmitter();

function pong() {
  console.log('pong');
}

ee.on('ping', pong);
ee.once('ping', pong);
ee.removeListener('ping', pong);

ee.emit('ping');
ee.emit('ping');
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

**`Since`**

v0.1.26

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:439

___

### setMaxListeners

**setMaxListeners**(`n`): [`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

By default `EventEmitter`s will print a warning if more than `10` listeners are
added for a particular event. This is a useful default that helps finding
memory leaks. The `emitter.setMaxListeners()` method allows the limit to be
modified for this specific `EventEmitter` instance. The value can be set to`Infinity` (or `0`) to indicate an unlimited number of listeners.

Returns a reference to the `EventEmitter`, so that calls can be chained.

**`Since`**

v0.3.5

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

[`ProtocolNetworkGenerator`](dxos_protocol_network_generator.ProtocolNetworkGenerator.md)

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:465

___

### getEventListeners

`Static` **getEventListeners**(`emitter`, `name`): `Function`[]

Returns a copy of the array of listeners for the event named `eventName`.

For `EventEmitter`s this behaves exactly the same as calling `.listeners` on
the emitter.

For `EventTarget`s this is the only way to get the event listeners for the
event target. This is useful for debugging and diagnostic purposes.

```js
const { getEventListeners, EventEmitter } = require('events');

{
  const ee = new EventEmitter();
  const listener = () => console.log('Events are fun');
  ee.on('foo', listener);
  getEventListeners(ee, 'foo'); // [listener]
}
{
  const et = new EventTarget();
  const listener = () => console.log('Events are fun');
  et.addEventListener('foo', listener);
  getEventListeners(et, 'foo'); // [listener]
}
```

**`Since`**

v15.2.0

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `EventEmitter` \| `DOMEventTarget` |
| `name` | `string` \| `symbol` |

#### Returns

`Function`[]

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:262

___

### listenerCount

`Static` **listenerCount**(`emitter`, `eventName`): `number`

A class method that returns the number of listeners for the given `eventName`registered on the given `emitter`.

```js
const { EventEmitter, listenerCount } = require('events');
const myEmitter = new EventEmitter();
myEmitter.on('event', () => {});
myEmitter.on('event', () => {});
console.log(listenerCount(myEmitter, 'event'));
// Prints: 2
```

**`Since`**

v0.9.12

**`Deprecated`**

Since v3.2.0 - Use `listenerCount` instead.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `emitter` | `EventEmitter` | The emitter to query |
| `eventName` | `string` \| `symbol` | The event name |

#### Returns

`number`

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:234

___

### on

`Static` **on**(`emitter`, `eventName`, `options?`): `AsyncIterableIterator`<`any`\>

```js
const { on, EventEmitter } = require('events');

(async () => {
  const ee = new EventEmitter();

  // Emit later on
  process.nextTick(() => {
    ee.emit('foo', 'bar');
    ee.emit('foo', 42);
  });

  for await (const event of on(ee, 'foo')) {
    // The execution of this inner block is synchronous and it
    // processes one event at a time (even with await). Do not use
    // if concurrent execution is required.
    console.log(event); // prints ['bar'] [42]
  }
  // Unreachable here
})();
```

Returns an `AsyncIterator` that iterates `eventName` events. It will throw
if the `EventEmitter` emits `'error'`. It removes all listeners when
exiting the loop. The `value` returned by each iteration is an array
composed of the emitted event arguments.

An `AbortSignal` can be used to cancel waiting on events:

```js
const { on, EventEmitter } = require('events');
const ac = new AbortController();

(async () => {
  const ee = new EventEmitter();

  // Emit later on
  process.nextTick(() => {
    ee.emit('foo', 'bar');
    ee.emit('foo', 42);
  });

  for await (const event of on(ee, 'foo', { signal: ac.signal })) {
    // The execution of this inner block is synchronous and it
    // processes one event at a time (even with await). Do not use
    // if concurrent execution is required.
    console.log(event); // prints ['bar'] [42]
  }
  // Unreachable here
})();

process.nextTick(() => ac.abort());
```

**`Since`**

v13.6.0, v12.16.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `emitter` | `EventEmitter` | - |
| `eventName` | `string` | The name of the event being listened for |
| `options?` | `StaticEventEmitterOptions` | - |

#### Returns

`AsyncIterableIterator`<`any`\>

that iterates `eventName` events emitted by the `emitter`

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:217

___

### once

`Static` **once**(`emitter`, `eventName`, `options?`): `Promise`<`any`[]\>

Creates a `Promise` that is fulfilled when the `EventEmitter` emits the given
event or that is rejected if the `EventEmitter` emits `'error'` while waiting.
The `Promise` will resolve with an array of all the arguments emitted to the
given event.

This method is intentionally generic and works with the web platform [EventTarget](https://dom.spec.whatwg.org/#interface-eventtarget) interface, which has no special`'error'` event
semantics and does not listen to the `'error'` event.

```js
const { once, EventEmitter } = require('events');

async function run() {
  const ee = new EventEmitter();

  process.nextTick(() => {
    ee.emit('myevent', 42);
  });

  const [value] = await once(ee, 'myevent');
  console.log(value);

  const err = new Error('kaboom');
  process.nextTick(() => {
    ee.emit('error', err);
  });

  try {
    await once(ee, 'myevent');
  } catch (err) {
    console.log('error happened', err);
  }
}

run();
```

The special handling of the `'error'` event is only used when `events.once()`is used to wait for another event. If `events.once()` is used to wait for the
'`error'` event itself, then it is treated as any other kind of event without
special handling:

```js
const { EventEmitter, once } = require('events');

const ee = new EventEmitter();

once(ee, 'error')
  .then(([err]) => console.log('ok', err.message))
  .catch((err) => console.log('error', err.message));

ee.emit('error', new Error('boom'));

// Prints: ok boom
```

An `AbortSignal` can be used to cancel waiting for the event:

```js
const { EventEmitter, once } = require('events');

const ee = new EventEmitter();
const ac = new AbortController();

async function foo(emitter, event, signal) {
  try {
    await once(emitter, event, { signal });
    console.log('event emitted!');
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Waiting for the event was canceled!');
    } else {
      console.error('There was an error', error.message);
    }
  }
}

foo(ee, 'foo', ac.signal);
ac.abort(); // Abort waiting for the event
ee.emit('foo'); // Prints: Waiting for the event was canceled!
```

**`Since`**

v11.13.0, v10.16.0

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `NodeEventTarget` |
| `eventName` | `string` \| `symbol` |
| `options?` | `StaticEventEmitterOptions` |

#### Returns

`Promise`<`any`[]\>

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:157

`Static` **once**(`emitter`, `eventName`, `options?`): `Promise`<`any`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `DOMEventTarget` |
| `eventName` | `string` |
| `options?` | `StaticEventEmitterOptions` |

#### Returns

`Promise`<`any`[]\>

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:158
