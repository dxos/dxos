---
id: "dxos_feed_store"
title: "Module: @dxos/feed-store"
sidebar_label: "@dxos/feed-store"
sidebar_position: 0
custom_edit_url: null
---

## Classes

- [FeedDescriptor](../classes/dxos_feed_store.FeedDescriptor.md)
- [FeedStore](../classes/dxos_feed_store.FeedStore.md)
- [WritableArray](../classes/dxos_feed_store.WritableArray.md)

## Interfaces

- [CreateBatchStreamOptions](../interfaces/dxos_feed_store.CreateBatchStreamOptions.md)
- [CreateDescriptorOptions](../interfaces/dxos_feed_store.CreateDescriptorOptions.md)
- [CreateReadOnlyFeedOptions](../interfaces/dxos_feed_store.CreateReadOnlyFeedOptions.md)
- [CreateReadWriteFeedOptions](../interfaces/dxos_feed_store.CreateReadWriteFeedOptions.md)
- [FeedStoreOptions](../interfaces/dxos_feed_store.FeedStoreOptions.md)
- [HypercoreFeed](../interfaces/dxos_feed_store.HypercoreFeed.md)
- [Message](../interfaces/dxos_feed_store.Message.md)

## Type Aliases

### Hypercore

Ƭ **Hypercore**: (`storage`: `any`, `key?`: `any`, `options?`: `any`) => [`HypercoreFeed`](../interfaces/dxos_feed_store.HypercoreFeed.md)

#### Type declaration

▸ (`storage`, `key?`, `options?`): [`HypercoreFeed`](../interfaces/dxos_feed_store.HypercoreFeed.md)

##### Parameters

| Name | Type |
| :------ | :------ |
| `storage` | `any` |
| `key?` | `any` |
| `options?` | `any` |

##### Returns

[`HypercoreFeed`](../interfaces/dxos_feed_store.HypercoreFeed.md)

#### Defined in

[packages/echo/feed-store/src/hypercore-types.ts:57](https://github.com/dxos/dxos/blob/b06737400/packages/echo/feed-store/src/hypercore-types.ts#L57)

## Functions

### createBatchStream

▸ **createBatchStream**(`feed`, `opts?`): `ReadableStream`

#### Parameters

| Name | Type |
| :------ | :------ |
| `feed` | [`HypercoreFeed`](../interfaces/dxos_feed_store.HypercoreFeed.md) |
| `opts` | [`CreateBatchStreamOptions`](../interfaces/dxos_feed_store.CreateBatchStreamOptions.md) |

#### Returns

`ReadableStream`

#### Defined in

[packages/echo/feed-store/src/create-batch-stream.ts:20](https://github.com/dxos/dxos/blob/b06737400/packages/echo/feed-store/src/create-batch-stream.ts#L20)

___

### createReadable

▸ **createReadable**(): `Readable`

Creates a readStream stream that can be used as a buffer into which messages can be pushed.

#### Returns

`Readable`

#### Defined in

[packages/echo/feed-store/src/stream.ts:33](https://github.com/dxos/dxos/blob/b06737400/packages/echo/feed-store/src/stream.ts#L33)

___

### createTransform

▸ **createTransform**<`R`, `W`\>(`callback`): `Transform`

Creates a transform object stream.

#### Type parameters

| Name |
| :------ |
| `R` |
| `W` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`message`: `R`) => `Promise`<`undefined` \| `W`\> |

#### Returns

`Transform`

#### Defined in

[packages/echo/feed-store/src/stream.ts:59](https://github.com/dxos/dxos/blob/b06737400/packages/echo/feed-store/src/stream.ts#L59)

___

### createWritable

▸ **createWritable**<`T`\>(`callback`): `WritableStream`

Creates a writeStream object stream.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`message`: `T`) => `Promise`<`void`\> |

#### Returns

`WritableStream`

#### Defined in

[packages/echo/feed-store/src/stream.ts:42](https://github.com/dxos/dxos/blob/b06737400/packages/echo/feed-store/src/stream.ts#L42)

___

### createWritableFeedStream

▸ **createWritableFeedStream**(`feed`): `Writable`

Returns a stream that appends messages directly to a hypercore feed.

#### Parameters

| Name | Type |
| :------ | :------ |
| `feed` | [`HypercoreFeed`](../interfaces/dxos_feed_store.HypercoreFeed.md) |

#### Returns

`Writable`

#### Defined in

[packages/echo/feed-store/src/stream.ts:23](https://github.com/dxos/dxos/blob/b06737400/packages/echo/feed-store/src/stream.ts#L23)
