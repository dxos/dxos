# Class: MockFeedWriter<T\>

[@dxos/echo-protocol](../modules/dxos_echo_protocol.md).MockFeedWriter

## Type parameters

| Name |
| :------ |
| `T` |

## Implements

- [`FeedWriter`](../interfaces/dxos_echo_protocol.FeedWriter.md)<`T`\>

## Constructors

### constructor

**new MockFeedWriter**<`T`\>(`feedKey?`)

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `feedKey` | `PublicKey` |

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-writer.ts:52](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L52)

## Properties

### feedKey

 `Readonly` **feedKey**: `PublicKey`

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-writer.ts:53](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L53)

___

### messages

 `Readonly` **messages**: `T`[] = `[]`

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-writer.ts:48](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L48)

___

### written

 `Readonly` **written**: `Event`<[`T`, [`WriteReceipt`](../interfaces/dxos_echo_protocol.WriteReceipt.md)]\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-writer.ts:50](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L50)

## Methods

### write

**write**(`message`): `Promise`<[`WriteReceipt`](../interfaces/dxos_echo_protocol.WriteReceipt.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `T` |

#### Returns

`Promise`<[`WriteReceipt`](../interfaces/dxos_echo_protocol.WriteReceipt.md)\>

#### Implementation of

FeedWriter.write

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-writer.ts:56](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L56)
