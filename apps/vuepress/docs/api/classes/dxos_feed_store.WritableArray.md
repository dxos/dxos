# Class: WritableArray<T\>

[@dxos/feed-store](../modules/dxos_feed_store.md).WritableArray

Wriable stream that collects objects (e.g., for testing).

## Type parameters

| Name |
| :------ |
| `T` |

## Hierarchy

- `Writable`

  ↳ **`WritableArray`**

## Table of contents

### Constructors

- [constructor](dxos_feed_store.WritableArray.md#constructor)

### Properties

- [\_objects](dxos_feed_store.WritableArray.md#_objects)
- [destroyed](dxos_feed_store.WritableArray.md#destroyed)
- [writable](dxos_feed_store.WritableArray.md#writable)
- [writableCorked](dxos_feed_store.WritableArray.md#writablecorked)
- [writableEnded](dxos_feed_store.WritableArray.md#writableended)
- [writableFinished](dxos_feed_store.WritableArray.md#writablefinished)
- [writableHighWaterMark](dxos_feed_store.WritableArray.md#writablehighwatermark)
- [writableLength](dxos_feed_store.WritableArray.md#writablelength)
- [writableObjectMode](dxos_feed_store.WritableArray.md#writableobjectmode)
- [captureRejectionSymbol](dxos_feed_store.WritableArray.md#capturerejectionsymbol)
- [captureRejections](dxos_feed_store.WritableArray.md#capturerejections)
- [defaultMaxListeners](dxos_feed_store.WritableArray.md#defaultmaxlisteners)
- [errorMonitor](dxos_feed_store.WritableArray.md#errormonitor)

### Accessors

- [objects](dxos_feed_store.WritableArray.md#objects)

### Methods

- [\_construct](dxos_feed_store.WritableArray.md#_construct)
- [\_destroy](dxos_feed_store.WritableArray.md#_destroy)
- [\_final](dxos_feed_store.WritableArray.md#_final)
- [\_write](dxos_feed_store.WritableArray.md#_write)
- [\_writev](dxos_feed_store.WritableArray.md#_writev)
- [addListener](dxos_feed_store.WritableArray.md#addlistener)
- [clear](dxos_feed_store.WritableArray.md#clear)
- [cork](dxos_feed_store.WritableArray.md#cork)
- [destroy](dxos_feed_store.WritableArray.md#destroy)
- [emit](dxos_feed_store.WritableArray.md#emit)
- [end](dxos_feed_store.WritableArray.md#end)
- [eventNames](dxos_feed_store.WritableArray.md#eventnames)
- [getMaxListeners](dxos_feed_store.WritableArray.md#getmaxlisteners)
- [listenerCount](dxos_feed_store.WritableArray.md#listenercount)
- [listeners](dxos_feed_store.WritableArray.md#listeners)
- [off](dxos_feed_store.WritableArray.md#off)
- [on](dxos_feed_store.WritableArray.md#on)
- [once](dxos_feed_store.WritableArray.md#once)
- [pipe](dxos_feed_store.WritableArray.md#pipe)
- [prependListener](dxos_feed_store.WritableArray.md#prependlistener)
- [prependOnceListener](dxos_feed_store.WritableArray.md#prependoncelistener)
- [rawListeners](dxos_feed_store.WritableArray.md#rawlisteners)
- [removeAllListeners](dxos_feed_store.WritableArray.md#removealllisteners)
- [removeListener](dxos_feed_store.WritableArray.md#removelistener)
- [setDefaultEncoding](dxos_feed_store.WritableArray.md#setdefaultencoding)
- [setMaxListeners](dxos_feed_store.WritableArray.md#setmaxlisteners)
- [uncork](dxos_feed_store.WritableArray.md#uncork)
- [write](dxos_feed_store.WritableArray.md#write)
- [getEventListeners](dxos_feed_store.WritableArray.md#geteventlisteners)
- [listenerCount](dxos_feed_store.WritableArray.md#listenercount-1)
- [on](dxos_feed_store.WritableArray.md#on-1)
- [once](dxos_feed_store.WritableArray.md#once-1)

## Constructors

### constructor

• **new WritableArray**<`T`\>()

#### Type parameters

| Name |
| :------ |
| `T` |

#### Overrides

Writable.constructor

#### Defined in

[packages/echo/feed-store/src/stream.ts:78](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/stream.ts#L78)

## Properties

### \_objects

• **\_objects**: `T`[] = `[]`

#### Defined in

[packages/echo/feed-store/src/stream.ts:76](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/stream.ts#L76)

___

### destroyed

• **destroyed**: `boolean`

Is `true` after `writable.destroy()` has been called.

**`Since`**

v8.0.0

#### Inherited from

Writable.destroyed

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:543

___

### writable

• `Readonly` **writable**: `boolean`

Is `true` if it is safe to call `writable.write()`, which means
the stream has not been destroyed, errored or ended.

**`Since`**

v11.4.0

#### Inherited from

Writable.writable

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:504

___

### writableCorked

• `Readonly` **writableCorked**: `number`

Number of times `writable.uncork()` needs to be
called in order to fully uncork the stream.

**`Since`**

v13.2.0, v12.16.0

#### Inherited from

Writable.writableCorked

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:538

___

### writableEnded

• `Readonly` **writableEnded**: `boolean`

Is `true` after `writable.end()` has been called. This property
does not indicate whether the data has been flushed, for this use `writable.writableFinished` instead.

**`Since`**

v12.9.0

#### Inherited from

Writable.writableEnded

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:510

___

### writableFinished

• `Readonly` **writableFinished**: `boolean`

Is set to `true` immediately before the `'finish'` event is emitted.

**`Since`**

v12.6.0

#### Inherited from

Writable.writableFinished

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:515

___

### writableHighWaterMark

• `Readonly` **writableHighWaterMark**: `number`

Return the value of `highWaterMark` passed when creating this `Writable`.

**`Since`**

v9.3.0

#### Inherited from

Writable.writableHighWaterMark

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:520

___

### writableLength

• `Readonly` **writableLength**: `number`

This property contains the number of bytes (or objects) in the queue
ready to be written. The value provides introspection data regarding
the status of the `highWaterMark`.

**`Since`**

v9.4.0

#### Inherited from

Writable.writableLength

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:527

___

### writableObjectMode

• `Readonly` **writableObjectMode**: `boolean`

Getter for the property `objectMode` of a given `Writable` stream.

**`Since`**

v12.3.0

#### Inherited from

Writable.writableObjectMode

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:532

___

### captureRejectionSymbol

▪ `Static` `Readonly` **captureRejectionSymbol**: typeof [`captureRejectionSymbol`](dxos_feed_store.WritableArray.md#capturerejectionsymbol)

#### Inherited from

Writable.captureRejectionSymbol

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:273

___

### captureRejections

▪ `Static` **captureRejections**: `boolean`

Sets or gets the default captureRejection value for all emitters.

#### Inherited from

Writable.captureRejections

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:278

___

### defaultMaxListeners

▪ `Static` **defaultMaxListeners**: `number`

#### Inherited from

Writable.defaultMaxListeners

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:279

___

### errorMonitor

▪ `Static` `Readonly` **errorMonitor**: typeof [`errorMonitor`](dxos_feed_store.WritableArray.md#errormonitor)

This symbol shall be used to install a listener for only monitoring `'error'`
events. Listeners installed using this symbol are called before the regular
`'error'` listeners are called.

Installing a listener using this symbol does not change the behavior once an
`'error'` event is emitted, therefore the process will still crash if no
regular `'error'` listener is installed.

#### Inherited from

Writable.errorMonitor

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:272

## Accessors

### objects

• `get` **objects**(): `T`[]

#### Returns

`T`[]

#### Defined in

[packages/echo/feed-store/src/stream.ts:86](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/stream.ts#L86)

## Methods

### \_construct

▸ `Optional` **_construct**(`callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`error?`: ``null`` \| `Error`) => `void` |

#### Returns

`void`

#### Inherited from

Writable.\_construct

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:553

___

### \_destroy

▸ **_destroy**(`error`, `callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | ``null`` \| `Error` |
| `callback` | (`error?`: ``null`` \| `Error`) => `void` |

#### Returns

`void`

#### Inherited from

Writable.\_destroy

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:554

___

### \_final

▸ **_final**(`callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`error?`: ``null`` \| `Error`) => `void` |

#### Returns

`void`

#### Inherited from

Writable.\_final

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:555

___

### \_write

▸ **_write**(`object`, `_`, `next`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | `any` |
| `_` | `BufferEncoding` |
| `next` | (`error?`: ``null`` \| `Error`) => `void` |

#### Returns

`void`

#### Overrides

Writable.\_write

#### Defined in

[packages/echo/feed-store/src/stream.ts:90](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/stream.ts#L90)

___

### \_writev

▸ `Optional` **_writev**(`chunks`, `callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunks` | { `chunk`: `any` ; `encoding`: `BufferEncoding`  }[] |
| `callback` | (`error?`: ``null`` \| `Error`) => `void` |

#### Returns

`void`

#### Inherited from

Writable.\_writev

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:546

___

### addListener

▸ **addListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

Event emitter
The defined events on documents including:
1. close
2. drain
3. error
4. finish
5. pipe
6. unpipe

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.addListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:721

▸ **addListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.addListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:722

▸ **addListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.addListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:723

▸ **addListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.addListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:724

▸ **addListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.addListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:725

▸ **addListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.addListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:726

▸ **addListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.addListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:727

___

### clear

▸ **clear**(): `void`

#### Returns

`void`

#### Defined in

[packages/echo/feed-store/src/stream.ts:82](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/stream.ts#L82)

___

### cork

▸ **cork**(): `void`

The `writable.cork()` method forces all written data to be buffered in memory.
The buffered data will be flushed when either the [uncork](dxos_feed_store.WritableArray.md#uncork) or [end](dxos_feed_store.WritableArray.md#end) methods are called.

The primary intent of `writable.cork()` is to accommodate a situation in which
several small chunks are written to the stream in rapid succession. Instead of
immediately forwarding them to the underlying destination, `writable.cork()`buffers all the chunks until `writable.uncork()` is called, which will pass them
all to `writable._writev()`, if present. This prevents a head-of-line blocking
situation where data is being buffered while waiting for the first small chunk
to be processed. However, use of `writable.cork()` without implementing`writable._writev()` may have an adverse effect on throughput.

See also: `writable.uncork()`, `writable._writev()`.

**`Since`**

v0.11.2

#### Returns

`void`

#### Inherited from

Writable.cork

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:659

___

### destroy

▸ **destroy**(`error?`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

Destroy the stream. Optionally emit an `'error'` event, and emit a `'close'`event (unless `emitClose` is set to `false`). After this call, the writable
stream has ended and subsequent calls to `write()` or `end()` will result in
an `ERR_STREAM_DESTROYED` error.
This is a destructive and immediate way to destroy a stream. Previous calls to`write()` may not have drained, and may trigger an `ERR_STREAM_DESTROYED` error.
Use `end()` instead of destroy if data should flush before close, or wait for
the `'drain'` event before destroying the stream.

Once `destroy()` has been called any further calls will be a no-op and no
further errors except from `_destroy()` may be emitted as `'error'`.

Implementors should not override this method,
but instead implement `writable._destroy()`.

**`Since`**

v8.0.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `error?` | `Error` | Optional, an error to emit with `'error'` event. |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.destroy

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:710

___

### emit

▸ **emit**(`event`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |

#### Returns

`boolean`

#### Inherited from

Writable.emit

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:728

▸ **emit**(`event`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |

#### Returns

`boolean`

#### Inherited from

Writable.emit

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:729

▸ **emit**(`event`, `err`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `err` | `Error` |

#### Returns

`boolean`

#### Inherited from

Writable.emit

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:730

▸ **emit**(`event`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |

#### Returns

`boolean`

#### Inherited from

Writable.emit

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:731

▸ **emit**(`event`, `src`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `src` | `Readable` |

#### Returns

`boolean`

#### Inherited from

Writable.emit

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:732

▸ **emit**(`event`, `src`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `src` | `Readable` |

#### Returns

`boolean`

#### Inherited from

Writable.emit

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:733

▸ **emit**(`event`, ...`args`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `...args` | `any`[] |

#### Returns

`boolean`

#### Inherited from

Writable.emit

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:734

___

### end

▸ **end**(`cb?`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

Calling the `writable.end()` method signals that no more data will be written
to the `Writable`. The optional `chunk` and `encoding` arguments allow one
final additional chunk of data to be written immediately before closing the
stream.

Calling the [write](dxos_feed_store.WritableArray.md#write) method after calling [end](dxos_feed_store.WritableArray.md#end) will raise an error.

```js
// Write 'hello, ' and then end with 'world!'.
const fs = require('fs');
const file = fs.createWriteStream('example.txt');
file.write('hello, ');
file.end('world!');
// Writing more now is not allowed!
```

**`Since`**

v0.9.4

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb?` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.end

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:642

▸ **end**(`chunk`, `cb?`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunk` | `any` |
| `cb?` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.end

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:643

▸ **end**(`chunk`, `encoding`, `cb?`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunk` | `any` |
| `encoding` | `BufferEncoding` |
| `cb?` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.end

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:644

___

### eventNames

▸ **eventNames**(): (`string` \| `symbol`)[]

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

#### Inherited from

Writable.eventNames

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:614

___

### getMaxListeners

▸ **getMaxListeners**(): `number`

Returns the current max listener value for the `EventEmitter` which is either
set by `emitter.setMaxListeners(n)` or defaults to [defaultMaxListeners](dxos_feed_store.WritableArray.md#defaultmaxlisteners).

**`Since`**

v1.0.0

#### Returns

`number`

#### Inherited from

Writable.getMaxListeners

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:471

___

### listenerCount

▸ **listenerCount**(`eventName`): `number`

Returns the number of listeners listening to the event named `eventName`.

**`Since`**

v3.2.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` \| `symbol` | The name of the event being listened for |

#### Returns

`number`

#### Inherited from

Writable.listenerCount

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:561

___

### listeners

▸ **listeners**(`eventName`): `Function`[]

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

#### Inherited from

Writable.listeners

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:484

___

### off

▸ **off**(`eventName`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

Alias for `emitter.removeListener()`.

**`Since`**

v10.0.0

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.off

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:444

___

### on

▸ **on**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.on

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:735

▸ **on**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.on

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:736

▸ **on**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.on

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:737

▸ **on**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.on

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:738

▸ **on**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.on

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:739

▸ **on**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.on

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:740

▸ **on**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.on

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:741

___

### once

▸ **once**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.once

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:742

▸ **once**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.once

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:743

▸ **once**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.once

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:744

▸ **once**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.once

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:745

▸ **once**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.once

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:746

▸ **once**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.once

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:747

▸ **once**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.once

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:748

___

### pipe

▸ **pipe**<`T`\>(`destination`, `options?`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `WritableStream`<`T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `destination` | `T` |
| `options?` | `Object` |
| `options.end?` | `boolean` |

#### Returns

`T`

#### Inherited from

Writable.pipe

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:24

___

### prependListener

▸ **prependListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.prependListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:749

▸ **prependListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.prependListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:750

▸ **prependListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.prependListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:751

▸ **prependListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.prependListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:752

▸ **prependListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.prependListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:753

▸ **prependListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.prependListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:754

▸ **prependListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.prependListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:755

___

### prependOnceListener

▸ **prependOnceListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.prependOnceListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:756

▸ **prependOnceListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.prependOnceListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:757

▸ **prependOnceListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.prependOnceListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:758

▸ **prependOnceListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.prependOnceListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:759

▸ **prependOnceListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.prependOnceListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:760

▸ **prependOnceListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.prependOnceListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:761

▸ **prependOnceListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.prependOnceListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:762

___

### rawListeners

▸ **rawListeners**(`eventName`): `Function`[]

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

#### Inherited from

Writable.rawListeners

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:514

___

### removeAllListeners

▸ **removeAllListeners**(`event?`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

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

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.removeAllListeners

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:455

___

### removeListener

▸ **removeListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.removeListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:763

▸ **removeListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.removeListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:764

▸ **removeListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.removeListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:765

▸ **removeListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.removeListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:766

▸ **removeListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.removeListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:767

▸ **removeListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.removeListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:768

▸ **removeListener**(`event`, `listener`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.removeListener

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:769

___

### setDefaultEncoding

▸ **setDefaultEncoding**(`encoding`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

The `writable.setDefaultEncoding()` method sets the default `encoding` for a `Writable` stream.

**`Since`**

v0.11.15

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `encoding` | `BufferEncoding` | The new default encoding |

#### Returns

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.setDefaultEncoding

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:619

___

### setMaxListeners

▸ **setMaxListeners**(`n`): [`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

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

[`WritableArray`](dxos_feed_store.WritableArray.md)<`T`\>

#### Inherited from

Writable.setMaxListeners

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:465

___

### uncork

▸ **uncork**(): `void`

The `writable.uncork()` method flushes all data buffered since [cork](dxos_feed_store.WritableArray.md#cork) was called.

When using `writable.cork()` and `writable.uncork()` to manage the buffering
of writes to a stream, it is recommended that calls to `writable.uncork()` be
deferred using `process.nextTick()`. Doing so allows batching of all`writable.write()` calls that occur within a given Node.js event loop phase.

```js
stream.cork();
stream.write('some ');
stream.write('data ');
process.nextTick(() => stream.uncork());
```

If the `writable.cork()` method is called multiple times on a stream, the
same number of calls to `writable.uncork()` must be called to flush the buffered
data.

```js
stream.cork();
stream.write('some ');
stream.cork();
stream.write('data ');
process.nextTick(() => {
  stream.uncork();
  // The data will not be flushed until uncork() is called a second time.
  stream.uncork();
});
```

See also: `writable.cork()`.

**`Since`**

v0.11.2

#### Returns

`void`

#### Inherited from

Writable.uncork

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:693

___

### write

▸ **write**(`chunk`, `callback?`): `boolean`

The `writable.write()` method writes some data to the stream, and calls the
supplied `callback` once the data has been fully handled. If an error
occurs, the `callback` will be called with the error as its
first argument. The `callback` is called asynchronously and before `'error'` is
emitted.

The return value is `true` if the internal buffer is less than the`highWaterMark` configured when the stream was created after admitting `chunk`.
If `false` is returned, further attempts to write data to the stream should
stop until the `'drain'` event is emitted.

While a stream is not draining, calls to `write()` will buffer `chunk`, and
return false. Once all currently buffered chunks are drained (accepted for
delivery by the operating system), the `'drain'` event will be emitted.
It is recommended that once `write()` returns false, no more chunks be written
until the `'drain'` event is emitted. While calling `write()` on a stream that
is not draining is allowed, Node.js will buffer all written chunks until
maximum memory usage occurs, at which point it will abort unconditionally.
Even before it aborts, high memory usage will cause poor garbage collector
performance and high RSS (which is not typically released back to the system,
even after the memory is no longer required). Since TCP sockets may never
drain if the remote peer does not read the data, writing a socket that is
not draining may lead to a remotely exploitable vulnerability.

Writing data while the stream is not draining is particularly
problematic for a `Transform`, because the `Transform` streams are paused
by default until they are piped or a `'data'` or `'readable'` event handler
is added.

If the data to be written can be generated or fetched on demand, it is
recommended to encapsulate the logic into a `Readable` and use [pipe](dxos_feed_store.WritableArray.md#pipe). However, if calling `write()` is preferred, it is
possible to respect backpressure and avoid memory issues using the `'drain'` event:

```js
function write(data, cb) {
  if (!stream.write(data)) {
    stream.once('drain', cb);
  } else {
    process.nextTick(cb);
  }
}

// Wait for cb to be called before doing any other write.
write('hello', () => {
  console.log('Write completed, do more writes now.');
});
```

A `Writable` stream in object mode will always ignore the `encoding` argument.

**`Since`**

v0.9.4

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `chunk` | `any` | Optional data to write. For streams not operating in object mode, `chunk` must be a string, `Buffer` or `Uint8Array`. For object mode streams, `chunk` may be any JavaScript value other than `null`. |
| `callback?` | (`error`: `undefined` \| ``null`` \| `Error`) => `void` | Callback for when this chunk of data is flushed. |

#### Returns

`boolean`

`false` if the stream wishes for the calling code to wait for the `'drain'` event to be emitted before continuing to write additional data; otherwise `true`.

#### Inherited from

Writable.write

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:612

▸ **write**(`chunk`, `encoding`, `callback?`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunk` | `any` |
| `encoding` | `BufferEncoding` |
| `callback?` | (`error`: `undefined` \| ``null`` \| `Error`) => `void` |

#### Returns

`boolean`

#### Inherited from

Writable.write

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/stream.d.ts:613

___

### getEventListeners

▸ `Static` **getEventListeners**(`emitter`, `name`): `Function`[]

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

#### Inherited from

Writable.getEventListeners

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:262

___

### listenerCount

▸ `Static` **listenerCount**(`emitter`, `eventName`): `number`

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

#### Inherited from

Writable.listenerCount

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:234

___

### on

▸ `Static` **on**(`emitter`, `eventName`, `options?`): `AsyncIterableIterator`<`any`\>

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

#### Inherited from

Writable.on

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:217

___

### once

▸ `Static` **once**(`emitter`, `eventName`, `options?`): `Promise`<`any`[]\>

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

#### Inherited from

Writable.once

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:157

▸ `Static` **once**(`emitter`, `eventName`, `options?`): `Promise`<`any`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `DOMEventTarget` |
| `eventName` | `string` |
| `options?` | `StaticEventEmitterOptions` |

#### Returns

`Promise`<`any`[]\>

#### Inherited from

Writable.once

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/events.d.ts:158
