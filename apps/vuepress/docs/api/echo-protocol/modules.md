# @dxos/echo-protocol

## Table of contents

### Classes

- [FeedStoreIterator](classes/FeedStoreIterator.md)
- [MockFeedWriter](classes/MockFeedWriter.md)

### Interfaces

- [FeedWriter](interfaces/FeedWriter.md)
- [IEchoStream](interfaces/IEchoStream.md)
- [IFeedGenericBlock](interfaces/IFeedGenericBlock.md)
- [IHaloStream](interfaces/IHaloStream.md)
- [MutationMeta](interfaces/MutationMeta.md)
- [MutationMetaWithTimeframe](interfaces/MutationMetaWithTimeframe.md)
- [WriteReceipt](interfaces/WriteReceipt.md)

### Type Aliases

- [FeedBlock](modules.md#feedblock)
- [FeedKey](modules.md#feedkey)
- [FeedMeta](modules.md#feedmeta)
- [FeedSelector](modules.md#feedselector)
- [IdentityKey](modules.md#identitykey)
- [ItemID](modules.md#itemid)
- [ItemType](modules.md#itemtype)
- [MessageSelector](modules.md#messageselector)
- [PartyKey](modules.md#partykey)
- [SwarmKey](modules.md#swarmkey)

### Variables

- [codec](modules.md#codec)

### Functions

- [createFeedMeta](modules.md#createfeedmeta)
- [createFeedWriter](modules.md#createfeedwriter)
- [createMockFeedWriterFromStream](modules.md#createmockfeedwriterfromstream)
- [createTestItemMutation](modules.md#createtestitemmutation)
- [mapFeedWriter](modules.md#mapfeedwriter)

## Type Aliases

### FeedBlock

Ƭ **FeedBlock**: [`IFeedGenericBlock`](interfaces/IFeedGenericBlock.md)<`FeedMessage`\>

#### Defined in

[types.ts:64](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/types.ts#L64)

___

### FeedKey

Ƭ **FeedKey**: `PublicKey`

#### Defined in

[types.ts:26](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/types.ts#L26)

___

### FeedMeta

Ƭ **FeedMeta**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `feedKey` | [`FeedKey`](modules.md#feedkey) |
| `seq` | `number` |

#### Defined in

[types.ts:28](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/types.ts#L28)

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

[feeds/feed-store-iterator.ts:27](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L27)

___

### IdentityKey

Ƭ **IdentityKey**: `PublicKey`

#### Defined in

[types.ts:100](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/types.ts#L100)

___

### ItemID

Ƭ **ItemID**: `string`

#### Defined in

[types.ts:84](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/types.ts#L84)

___

### ItemType

Ƭ **ItemType**: `string`

#### Defined in

[types.ts:86](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/types.ts#L86)

___

### MessageSelector

Ƭ **MessageSelector**: (`candidates`: [`FeedBlock`](modules.md#feedblock)[]) => `number` \| `undefined`

#### Type declaration

▸ (`candidates`): `number` \| `undefined`

##### Parameters

| Name | Type |
| :------ | :------ |
| `candidates` | [`FeedBlock`](modules.md#feedblock)[] |

##### Returns

`number` \| `undefined`

#### Defined in

[feeds/feed-store-iterator.ts:26](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L26)

___

### PartyKey

Ƭ **PartyKey**: `PublicKey`

#### Defined in

[types.ts:94](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/types.ts#L94)

___

### SwarmKey

Ƭ **SwarmKey**: `Uint8Array`

#### Defined in

[types.ts:20](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/types.ts#L20)

## Variables

### codec

• `Const` **codec**: `WithTypeUrl`<`any`\>

#### Defined in

[codec.ts:9](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/codec.ts#L9)

## Functions

### createFeedMeta

▸ **createFeedMeta**(`block`): [`FeedMeta`](modules.md#feedmeta)

Constructs a meta object from the raw stream object.

#### Parameters

| Name | Type |
| :------ | :------ |
| `block` | [`IFeedGenericBlock`](interfaces/IFeedGenericBlock.md)<`any`\> |

#### Returns

[`FeedMeta`](modules.md#feedmeta)

#### Defined in

[types.ts:59](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/types.ts#L59)

___

### createFeedWriter

▸ **createFeedWriter**<`T`\>(`feed`): [`FeedWriter`](interfaces/FeedWriter.md)<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `feed` | `HypercoreFeed` |

#### Returns

[`FeedWriter`](interfaces/FeedWriter.md)<`T`\>

#### Defined in

[feeds/feed-writer.ts:27](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L27)

___

### createMockFeedWriterFromStream

▸ **createMockFeedWriterFromStream**(`strem`): [`FeedWriter`](interfaces/FeedWriter.md)<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `strem` | `WritableStream` |

#### Returns

[`FeedWriter`](interfaces/FeedWriter.md)<`any`\>

#### Defined in

[feeds/feed-writer.ts:37](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L37)

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

[testing.ts:15](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/testing.ts#L15)

___

### mapFeedWriter

▸ **mapFeedWriter**<`T`, `U`\>(`map`, `writer`): [`FeedWriter`](interfaces/FeedWriter.md)<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |
| `U` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `map` | (`arg`: `T`) => `MaybePromise`<`U`\> |
| `writer` | [`FeedWriter`](interfaces/FeedWriter.md)<`U`\> |

#### Returns

[`FeedWriter`](interfaces/FeedWriter.md)<`T`\>

#### Defined in

[feeds/feed-writer.ts:23](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L23)
