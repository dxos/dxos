---
id: "dxos_echo_protocol"
title: "Module: @dxos/echo-protocol"
sidebar_label: "@dxos/echo-protocol"
sidebar_position: 0
custom_edit_url: null
---

## Namespaces

- [InvitationDescriptor](../namespaces/dxos_echo_protocol.InvitationDescriptor.md)
- [ItemMutation](../namespaces/dxos_echo_protocol.ItemMutation.md)
- [SubscribeEntityStreamResponse](../namespaces/dxos_echo_protocol.SubscribeEntityStreamResponse.md)

## Classes

- [FeedStoreIterator](../classes/dxos_echo_protocol.FeedStoreIterator.md)
- [MockFeedWriter](../classes/dxos_echo_protocol.MockFeedWriter.md)

## Interfaces

- [CredentialsMessage](../interfaces/dxos_echo_protocol.CredentialsMessage.md)
- [DataService](../interfaces/dxos_echo_protocol.DataService.md)
- [DatabaseSnapshot](../interfaces/dxos_echo_protocol.DatabaseSnapshot.md)
- [EchoEnvelope](../interfaces/dxos_echo_protocol.EchoEnvelope.md)
- [EchoMetadata](../interfaces/dxos_echo_protocol.EchoMetadata.md)
- [FeedMessage](../interfaces/dxos_echo_protocol.FeedMessage.md)
- [FeedWriter](../interfaces/dxos_echo_protocol.FeedWriter.md)
- [HaloStateSnapshot](../interfaces/dxos_echo_protocol.HaloStateSnapshot.md)
- [IEchoStream](../interfaces/dxos_echo_protocol.IEchoStream.md)
- [IFeedGenericBlock](../interfaces/dxos_echo_protocol.IFeedGenericBlock.md)
- [IHaloStream](../interfaces/dxos_echo_protocol.IHaloStream.md)
- [InvitationDescriptor](../interfaces/dxos_echo_protocol.InvitationDescriptor-1.md)
- [ItemGenesis](../interfaces/dxos_echo_protocol.ItemGenesis.md)
- [ItemMutation](../interfaces/dxos_echo_protocol.ItemMutation-1.md)
- [ItemSnapshot](../interfaces/dxos_echo_protocol.ItemSnapshot.md)
- [LinkData](../interfaces/dxos_echo_protocol.LinkData.md)
- [LinkSnapshot](../interfaces/dxos_echo_protocol.LinkSnapshot.md)
- [ModelMutation](../interfaces/dxos_echo_protocol.ModelMutation.md)
- [ModelMutationMeta](../interfaces/dxos_echo_protocol.ModelMutationMeta.md)
- [ModelSnapshot](../interfaces/dxos_echo_protocol.ModelSnapshot.md)
- [MutationMeta](../interfaces/dxos_echo_protocol.MutationMeta.md)
- [MutationMetaWithTimeframe](../interfaces/dxos_echo_protocol.MutationMetaWithTimeframe.md)
- [MutationReceipt](../interfaces/dxos_echo_protocol.MutationReceipt.md)
- [PartyMetadata](../interfaces/dxos_echo_protocol.PartyMetadata.md)
- [PartySnapshot](../interfaces/dxos_echo_protocol.PartySnapshot.md)
- [SERVICES](../interfaces/dxos_echo_protocol.SERVICES.md)
- [SubscribeEntitySetRequest](../interfaces/dxos_echo_protocol.SubscribeEntitySetRequest.md)
- [SubscribeEntitySetResponse](../interfaces/dxos_echo_protocol.SubscribeEntitySetResponse.md)
- [SubscribeEntityStreamRequest](../interfaces/dxos_echo_protocol.SubscribeEntityStreamRequest.md)
- [SubscribeEntityStreamResponse](../interfaces/dxos_echo_protocol.SubscribeEntityStreamResponse-1.md)
- [TYPES](../interfaces/dxos_echo_protocol.TYPES.md)
- [TestItemMutation](../interfaces/dxos_echo_protocol.TestItemMutation.md)
- [TestItemSnapshot](../interfaces/dxos_echo_protocol.TestItemSnapshot.md)
- [TestListMutation](../interfaces/dxos_echo_protocol.TestListMutation.md)
- [WriteReceipt](../interfaces/dxos_echo_protocol.WriteReceipt.md)
- [WriteRequest](../interfaces/dxos_echo_protocol.WriteRequest.md)

## Type Aliases

### FeedBlock

Ƭ **FeedBlock**: [`IFeedGenericBlock`](../interfaces/dxos_echo_protocol.IFeedGenericBlock.md)<[`FeedMessage`](../interfaces/dxos_echo_protocol.FeedMessage.md)\>

#### Defined in

[packages/echo/echo-protocol/src/types.ts:63](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/types.ts#L63)

___

### FeedKey

Ƭ **FeedKey**: `PublicKey`

#### Defined in

[packages/echo/echo-protocol/src/types.ts:25](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/types.ts#L25)

___

### FeedMeta

Ƭ **FeedMeta**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `feedKey` | [`FeedKey`](dxos_echo_protocol.md#feedkey) |
| `seq` | `number` |

#### Defined in

[packages/echo/echo-protocol/src/types.ts:27](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/types.ts#L27)

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

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:25](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L25)

___

### IdentityKey

Ƭ **IdentityKey**: `PublicKey`

#### Defined in

[packages/echo/echo-protocol/src/types.ts:97](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/types.ts#L97)

___

### ItemID

Ƭ **ItemID**: `string`

#### Defined in

[packages/echo/echo-protocol/src/types.ts:81](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/types.ts#L81)

___

### ItemType

Ƭ **ItemType**: `string`

#### Defined in

[packages/echo/echo-protocol/src/types.ts:83](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/types.ts#L83)

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

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:24](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L24)

___

### PartyKey

Ƭ **PartyKey**: `PublicKey`

#### Defined in

[packages/echo/echo-protocol/src/types.ts:91](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/types.ts#L91)

___

### SwarmKey

Ƭ **SwarmKey**: `Uint8Array`

#### Defined in

[packages/echo/echo-protocol/src/types.ts:19](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/types.ts#L19)

## Variables

### codec

• `Const` **codec**: `ProtoCodec`<[`FeedMessage`](../interfaces/dxos_echo_protocol.FeedMessage.md)\>

#### Defined in

[packages/echo/echo-protocol/src/proto/index.ts:18](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/proto/index.ts#L18)

___

### schema

• `Const` **schema**: `Schema`<[`TYPES`](../interfaces/dxos_echo_protocol.TYPES.md), [`SERVICES`](../interfaces/dxos_echo_protocol.SERVICES.md)\>

#### Defined in

packages/echo/echo-protocol/src/proto/gen/index.ts:67

___

### schemaJson

• `Const` **schemaJson**: `any`

#### Defined in

packages/echo/echo-protocol/src/proto/gen/index.ts:66

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

[packages/echo/echo-protocol/src/types.ts:58](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/types.ts#L58)

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

[packages/echo/echo-protocol/src/feeds/feed-writer.ts:27](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L27)

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

[packages/echo/echo-protocol/src/feeds/feed-writer.ts:37](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L37)

___

### createTestItemMutation

▸ **createTestItemMutation**(`itemId`, `key`, `value`, `timeframe?`): [`FeedMessage`](../interfaces/dxos_echo_protocol.FeedMessage.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `itemId` | `string` |
| `key` | `string` |
| `value` | `string` |
| `timeframe` | `Timeframe` |

#### Returns

[`FeedMessage`](../interfaces/dxos_echo_protocol.FeedMessage.md)

#### Defined in

[packages/echo/echo-protocol/src/proto/messages.ts:15](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/proto/messages.ts#L15)

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

[packages/echo/echo-protocol/src/feeds/feed-writer.ts:23](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L23)
