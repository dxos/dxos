# Module: @dxos/echo-protocol

## Table of contents

### Classes

- [FeedStoreIterator](../classes/dxos_echo_protocol.FeedStoreIterator.md)
- [MockFeedWriter](../classes/dxos_echo_protocol.MockFeedWriter.md)

### Interfaces

- [FeedWriter](../interfaces/dxos_echo_protocol.FeedWriter.md)
- [IEchoStream](../interfaces/dxos_echo_protocol.IEchoStream.md)
- [IFeedGenericBlock](../interfaces/dxos_echo_protocol.IFeedGenericBlock.md)
- [IHaloStream](../interfaces/dxos_echo_protocol.IHaloStream.md)
- [MutationMeta](../interfaces/dxos_echo_protocol.MutationMeta.md)
- [MutationMetaWithTimeframe](../interfaces/dxos_echo_protocol.MutationMetaWithTimeframe.md)
- [WriteReceipt](../interfaces/dxos_echo_protocol.WriteReceipt.md)

### Type Aliases

- [FeedBlock](dxos_echo_protocol.md#feedblock)
- [FeedKey](dxos_echo_protocol.md#feedkey)
- [FeedMeta](dxos_echo_protocol.md#feedmeta)
- [FeedSelector](dxos_echo_protocol.md#feedselector)
- [IdentityKey](dxos_echo_protocol.md#identitykey)
- [ItemID](dxos_echo_protocol.md#itemid)
- [ItemType](dxos_echo_protocol.md#itemtype)
- [MessageSelector](dxos_echo_protocol.md#messageselector)
- [PartyKey](dxos_echo_protocol.md#partykey)
- [SwarmKey](dxos_echo_protocol.md#swarmkey)

### Variables

- [codec](dxos_echo_protocol.md#codec)

### Functions

- [createFeedMeta](dxos_echo_protocol.md#createfeedmeta)
- [createFeedWriter](dxos_echo_protocol.md#createfeedwriter)
- [createMockFeedWriterFromStream](dxos_echo_protocol.md#createmockfeedwriterfromstream)
- [createTestItemMutation](dxos_echo_protocol.md#createtestitemmutation)
- [mapFeedWriter](dxos_echo_protocol.md#mapfeedwriter)

## Type Aliases

### FeedBlock

Ƭ **FeedBlock**: [`IFeedGenericBlock`](../interfaces/dxos_echo_protocol.IFeedGenericBlock.md)<`FeedMessage`\>

#### Defined in

[packages/echo/echo-protocol/src/types.ts:64](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-protocol/src/types.ts#L64)

___

### FeedKey

Ƭ **FeedKey**: `PublicKey`

#### Defined in

[packages/echo/echo-protocol/src/types.ts:26](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-protocol/src/types.ts#L26)

___

### FeedMeta

Ƭ **FeedMeta**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `feedKey` | [`FeedKey`](dxos_echo_protocol.md#feedkey) |
| `seq` | `number` |

#### Defined in

[packages/echo/echo-protocol/src/types.ts:28](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-protocol/src/types.ts#L28)

___

### FeedSelector

Ƭ **FeedSelector**: (`descriptor`: `FeedDescriptor`) => `boolean`

#### Type declaration

▸ (`descriptor`): `boolean`

##### Parameters

| Name | Type |
| :------ | :------ |
| `descriptor` | `FeedDescriptor` |

##### Returns

`boolean`

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:27](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L27)

___

### IdentityKey

Ƭ **IdentityKey**: `PublicKey`

#### Defined in

[packages/echo/echo-protocol/src/types.ts:100](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-protocol/src/types.ts#L100)

___

### ItemID

Ƭ **ItemID**: `string`

#### Defined in

[packages/echo/echo-protocol/src/types.ts:84](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-protocol/src/types.ts#L84)

___

### ItemType

Ƭ **ItemType**: `string`

#### Defined in

[packages/echo/echo-protocol/src/types.ts:86](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-protocol/src/types.ts#L86)

___

### MessageSelector

Ƭ **MessageSelector**: (`candidates`: [`FeedBlock`](dxos_echo_protocol.md#feedblock)[]) => `number` \| `undefined`

#### Type declaration

▸ (`candidates`): `number` \| `undefined`

##### Parameters

| Name | Type |
| :------ | :------ |
| `candidates` | [`FeedBlock`](dxos_echo_protocol.md#feedblock)[] |

##### Returns

`number` \| `undefined`

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:26](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L26)

___

### PartyKey

Ƭ **PartyKey**: `PublicKey`

#### Defined in

[packages/echo/echo-protocol/src/types.ts:94](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-protocol/src/types.ts#L94)

___

### SwarmKey

Ƭ **SwarmKey**: `Uint8Array`

#### Defined in

[packages/echo/echo-protocol/src/types.ts:20](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-protocol/src/types.ts#L20)

## Variables

### codec

• `Const` **codec**: `WithTypeUrl`<`any`\>

#### Defined in

[packages/echo/echo-protocol/src/codec.ts:9](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-protocol/src/codec.ts#L9)

## Functions

### createFeedMeta

▸ **createFeedMeta**(`block`): [`FeedMeta`](dxos_echo_protocol.md#feedmeta)

Constructs a meta object from the raw stream object.

#### Parameters

| Name | Type |
| :------ | :------ |
| `block` | [`IFeedGenericBlock`](../interfaces/dxos_echo_protocol.IFeedGenericBlock.md)<`any`\> |

#### Returns

[`FeedMeta`](dxos_echo_protocol.md#feedmeta)

#### Defined in

[packages/echo/echo-protocol/src/types.ts:59](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-protocol/src/types.ts#L59)

___

### createFeedWriter

▸ **createFeedWriter**<`T`\>(`feed`): [`FeedWriter`](../interfaces/dxos_echo_protocol.FeedWriter.md)<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `feed` | `HypercoreFeed` |

#### Returns

[`FeedWriter`](../interfaces/dxos_echo_protocol.FeedWriter.md)<`T`\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-writer.ts:27](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L27)

___

### createMockFeedWriterFromStream

▸ **createMockFeedWriterFromStream**(`strem`): [`FeedWriter`](../interfaces/dxos_echo_protocol.FeedWriter.md)<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `strem` | `WritableStream` |

#### Returns

[`FeedWriter`](../interfaces/dxos_echo_protocol.FeedWriter.md)<`any`\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-writer.ts:37](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L37)

___

### createTestItemMutation

▸ **createTestItemMutation**(`itemId`, `key`, `value`, `timeframe?`): `FeedMessage`

#### Parameters

| Name | Type |
| :------ | :------ |
| `itemId` | `string` |
| `key` | `string` |
| `value` | `string` |
| `timeframe` | `Timeframe` |

#### Returns

`FeedMessage`

#### Defined in

[packages/echo/echo-protocol/src/testing.ts:15](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-protocol/src/testing.ts#L15)

___

### mapFeedWriter

▸ **mapFeedWriter**<`T`, `U`\>(`map`, `writer`): [`FeedWriter`](../interfaces/dxos_echo_protocol.FeedWriter.md)<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |
| `U` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `map` | (`arg`: `T`) => `MaybePromise`<`U`\> |
| `writer` | [`FeedWriter`](../interfaces/dxos_echo_protocol.FeedWriter.md)<`U`\> |

#### Returns

[`FeedWriter`](../interfaces/dxos_echo_protocol.FeedWriter.md)<`T`\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-writer.ts:23](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L23)
