# Interface: HypercoreFeed

[@dxos/feed-store](../modules/dxos_feed_store.md).HypercoreFeed

## Table of contents

### Properties

- [close](dxos_feed_store.HypercoreFeed.md#close)
- [closed](dxos_feed_store.HypercoreFeed.md#closed)
- [discoveryKey](dxos_feed_store.HypercoreFeed.md#discoverykey)
- [download](dxos_feed_store.HypercoreFeed.md#download)
- [downloaded](dxos_feed_store.HypercoreFeed.md#downloaded)
- [getBatch](dxos_feed_store.HypercoreFeed.md#getbatch)
- [head](dxos_feed_store.HypercoreFeed.md#head)
- [key](dxos_feed_store.HypercoreFeed.md#key)
- [length](dxos_feed_store.HypercoreFeed.md#length)
- [on](dxos_feed_store.HypercoreFeed.md#on)
- [opened](dxos_feed_store.HypercoreFeed.md#opened)
- [readable](dxos_feed_store.HypercoreFeed.md#readable)
- [ready](dxos_feed_store.HypercoreFeed.md#ready)
- [removeListener](dxos_feed_store.HypercoreFeed.md#removelistener)
- [secretKey](dxos_feed_store.HypercoreFeed.md#secretkey)
- [undownload](dxos_feed_store.HypercoreFeed.md#undownload)

### Methods

- [append](dxos_feed_store.HypercoreFeed.md#append)
- [createReadStream](dxos_feed_store.HypercoreFeed.md#createreadstream)
- [get](dxos_feed_store.HypercoreFeed.md#get)
- [replicate](dxos_feed_store.HypercoreFeed.md#replicate)

## Properties

### close

• **close**: (`arg`: `any`) => `any`

#### Type declaration

▸ (`arg`): `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `arg` | `any` |

##### Returns

`any`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:54](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L54)

___

### closed

• **closed**: `boolean`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:17](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L17)

___

### discoveryKey

• **discoveryKey**: `Buffer`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:14](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L14)

___

### download

• **download**: (`options`: `any`) => `any`

#### Type declaration

▸ (`options`): `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `any` |

##### Returns

`any`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:49](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L49)

___

### downloaded

• **downloaded**: (`start`: `number`, `batchEnd`: `number`) => `boolean`

#### Type declaration

▸ (`start`, `batchEnd`): `boolean`

##### Parameters

| Name | Type |
| :------ | :------ |
| `start` | `number` |
| `batchEnd` | `number` |

##### Returns

`boolean`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:50](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L50)

___

### getBatch

• **getBatch**: (`n`: `number`, `maxMessages`: `number`, ...`args`: `any`[]) => `any`

#### Type declaration

▸ (`n`, `maxMessages`, ...`args`): `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |
| `maxMessages` | `number` |
| `...args` | `any`[] |

##### Returns

`any`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:48](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L48)

___

### head

• **head**: `any`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:45](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L45)

___

### key

• **key**: `Buffer`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:12](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L12)

___

### length

• **length**: `number`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:15](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L15)

___

### on

• **on**: (`s`: `string`, `cb`: () => `any`) => `any`

#### Type declaration

▸ (`s`, `cb`): `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `s` | `string` |
| `cb` | () => `any` |

##### Returns

`any`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:46](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L46)

___

### opened

• **opened**: `boolean`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:16](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L16)

___

### readable

• **readable**: `boolean`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:18](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L18)

___

### ready

• **ready**: `any`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:11](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L11)

___

### removeListener

• **removeListener**: (`s`: `string`, `cb`: () => `any`) => `any`

#### Type declaration

▸ (`s`, `cb`): `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `s` | `string` |
| `cb` | () => `any` |

##### Returns

`any`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:47](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L47)

___

### secretKey

• **secretKey**: `Buffer`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:13](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L13)

___

### undownload

• **undownload**: (`args`: `any`) => `void`

#### Type declaration

▸ (`args`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `args` | `any` |

##### Returns

`void`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:51](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L51)

## Methods

### append

▸ **append**(`data`, `callback?`): `void`

Appends a block of data to the feed.
Callback is called with (err, seq) when all data has been written at the returned seq number or error will be not null.

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `any` |
| `callback?` | (`err`: ``null`` \| `Error`, `seq?`: `number`) => `void` |

#### Returns

`void`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:26](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L26)

___

### createReadStream

▸ **createReadStream**(`options?`): `ReadableStream`

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | `any` |

#### Returns

`ReadableStream`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:43](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L43)

___

### get

▸ **get**(`index`, `callback`): `void`

Gets a block of data. If the data is not available locally this method will prioritize and wait for the data to be downloaded before calling the callback.

#### Parameters

| Name | Type |
| :------ | :------ |
| `index` | `number` |
| `callback` | (`err`: ``null`` \| `Error`, `data?`: [`Message`](dxos_feed_store.Message.md)) => `void` |

#### Returns

`void`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:33](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L33)

▸ **get**(`index`, `options`, `callback`): `void`

Get a block of data. If the data is not available locally this method will prioritize and wait for the data to be downloaded before calling the callback.

#### Parameters

| Name | Type |
| :------ | :------ |
| `index` | `number` |
| `options` | `any` |
| `callback` | (`err`: ``null`` \| `Error`, `data?`: [`Message`](dxos_feed_store.Message.md)) => `void` |

#### Returns

`void`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:41](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L41)

___

### replicate

▸ **replicate**(`options`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `any` |

#### Returns

`void`

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:53](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/feed-store/src/hypercore-types.ts#L53)
