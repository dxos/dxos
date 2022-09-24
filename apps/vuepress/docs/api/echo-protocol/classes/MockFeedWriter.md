# Class: MockFeedWriter<T\>

## Type parameters

| Name |
| :------ |
| `T` |

## Implements

- [`FeedWriter`](../interfaces/FeedWriter.md)<`T`\>

## Table of contents

### Constructors

- [constructor](MockFeedWriter.md#constructor)

### Properties

- [feedKey](MockFeedWriter.md#feedkey)
- [messages](MockFeedWriter.md#messages)
- [written](MockFeedWriter.md#written)

### Methods

- [write](MockFeedWriter.md#write)

## Constructors

### constructor

• **new MockFeedWriter**<`T`\>(`feedKey?`)

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `feedKey` | `PublicKey` |

#### Defined in

[feeds/feed-writer.ts:52](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L52)

## Properties

### feedKey

• `Readonly` **feedKey**: `PublicKey`

#### Defined in

[feeds/feed-writer.ts:53](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L53)

___

### messages

• `Readonly` **messages**: `T`[] = `[]`

#### Defined in

[feeds/feed-writer.ts:48](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L48)

___

### written

• `Readonly` **written**: `Event`<[`T`, [`WriteReceipt`](../interfaces/WriteReceipt.md)]\>

#### Defined in

[feeds/feed-writer.ts:50](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L50)

## Methods

### write

▸ **write**(`message`): `Promise`<[`WriteReceipt`](../interfaces/WriteReceipt.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `T` |

#### Returns

`Promise`<[`WriteReceipt`](../interfaces/WriteReceipt.md)\>

#### Implementation of

FeedWriter.write

#### Defined in

[feeds/feed-writer.ts:56](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L56)
