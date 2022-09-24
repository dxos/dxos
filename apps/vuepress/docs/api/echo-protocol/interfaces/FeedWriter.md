# Interface: FeedWriter<T\>

## Type parameters

| Name |
| :------ |
| `T` |

## Implemented by

- [`MockFeedWriter`](../classes/MockFeedWriter.md)

## Table of contents

### Properties

- [write](FeedWriter.md#write)

## Properties

### write

• **write**: (`message`: `T`) => `Promise`<[`WriteReceipt`](WriteReceipt.md)\>

#### Type declaration

▸ (`message`): `Promise`<[`WriteReceipt`](WriteReceipt.md)\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `T` |

##### Returns

`Promise`<[`WriteReceipt`](WriteReceipt.md)\>

#### Defined in

[feeds/feed-writer.ts:20](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L20)
