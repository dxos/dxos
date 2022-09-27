---
id: "dxos_feed_store.FeedStore"
title: "Class: FeedStore"
sidebar_label: "FeedStore"
custom_edit_url: null
---

[@dxos/feed-store](../modules/dxos_feed_store.md).FeedStore

FeedStore

Management of multiple feeds to create, update, load, find and delete feeds
into a persist repository storage.

## Constructors

### constructor

• **new FeedStore**(`directory`, `options?`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `directory` | `Directory` | RandomAccessStorage to use by default by the feeds. |
| `options` | [`FeedStoreOptions`](../interfaces/dxos_feed_store.FeedStoreOptions.md) | Feedstore options. |

#### Defined in

[packages/echo/feed-store/src/feed-store.ts:62](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/feed-store/src/feed-store.ts#L62)

## Properties

### \_descriptors

• `Private` **\_descriptors**: `Map`<`string`, [`FeedDescriptor`](dxos_feed_store.FeedDescriptor.md)\>

#### Defined in

[packages/echo/feed-store/src/feed-store.ts:51](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/feed-store/src/feed-store.ts#L51)

___

### \_directory

• `Private` **\_directory**: `Directory`

#### Defined in

[packages/echo/feed-store/src/feed-store.ts:48](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/feed-store/src/feed-store.ts#L48)

___

### \_hypercore

• `Private` **\_hypercore**: [`Hypercore`](../modules/dxos_feed_store.md#hypercore)

#### Defined in

[packages/echo/feed-store/src/feed-store.ts:50](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/feed-store/src/feed-store.ts#L50)

___

### \_valueEncoding

• `Private` **\_valueEncoding**: `undefined` \| `ValueEncoding`

#### Defined in

[packages/echo/feed-store/src/feed-store.ts:49](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/feed-store/src/feed-store.ts#L49)

___

### feedOpenedEvent

• `Readonly` **feedOpenedEvent**: `Event`<[`FeedDescriptor`](dxos_feed_store.FeedDescriptor.md)\>

Is emitted when a new feed represented by FeedDescriptor is opened.

#### Defined in

[packages/echo/feed-store/src/feed-store.ts:56](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/feed-store/src/feed-store.ts#L56)

## Accessors

### storage

• `get` **storage**(): `Directory`

#### Returns

`Directory`

#### Defined in

[packages/echo/feed-store/src/feed-store.ts:81](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/feed-store/src/feed-store.ts#L81)

## Methods

### \_createDescriptor

▸ `Private` **_createDescriptor**(`options`): `Promise`<[`FeedDescriptor`](dxos_feed_store.FeedDescriptor.md)\>

Factory to create a new FeedDescriptor.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`CreateDescriptorOptions`](../interfaces/dxos_feed_store.CreateDescriptorOptions.md) |

#### Returns

`Promise`<[`FeedDescriptor`](dxos_feed_store.FeedDescriptor.md)\>

#### Defined in

[packages/echo/feed-store/src/feed-store.ts:113](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/feed-store/src/feed-store.ts#L113)

___

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/feed-store/src/feed-store.ts:85](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/feed-store/src/feed-store.ts#L85)

___

### openReadOnlyFeed

▸ **openReadOnlyFeed**(`key`): `Promise`<[`FeedDescriptor`](dxos_feed_store.FeedDescriptor.md)\>

Create a readonly feed to Feedstore

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `PublicKey` |

#### Returns

`Promise`<[`FeedDescriptor`](dxos_feed_store.FeedDescriptor.md)\>

#### Defined in

[packages/echo/feed-store/src/feed-store.ts:105](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/feed-store/src/feed-store.ts#L105)

___

### openReadWriteFeed

▸ **openReadWriteFeed**(`key`, `secretKey`): `Promise`<[`FeedDescriptor`](dxos_feed_store.FeedDescriptor.md)\>

Create a feed to Feedstore

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `PublicKey` |
| `secretKey` | `Buffer` |

#### Returns

`Promise`<[`FeedDescriptor`](dxos_feed_store.FeedDescriptor.md)\>

#### Defined in

[packages/echo/feed-store/src/feed-store.ts:94](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/feed-store/src/feed-store.ts#L94)
