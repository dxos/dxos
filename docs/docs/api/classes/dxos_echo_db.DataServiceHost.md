# Class: DataServiceHost

[@dxos/echo-db](../modules/dxos_echo_db.md).DataServiceHost

Provides methods for DataService for a single party.

A DataServiceRouter must be placed before it to route requests to different DataServiceHost instances based on party id.

## Constructors

### constructor

**new DataServiceHost**(`_itemManager`, `_itemDemuxer`, `_writeStream?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_itemManager` | [`ItemManager`](dxos_echo_db.ItemManager.md) |
| `_itemDemuxer` | [`ItemDemuxer`](dxos_echo_db.ItemDemuxer.md) |
| `_writeStream?` | `FeedWriter`<`EchoEnvelope`\> |

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/data-service-host.ts:36](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/data-service-host.ts#L36)

## Methods

### subscribeEntitySet

**subscribeEntitySet**(): `Stream`<`SubscribeEntitySetResponse`\>

Returns a stream with a list of active entities in the party.

#### Returns

`Stream`<`SubscribeEntitySetResponse`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/data-service-host.ts:45](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/data-service-host.ts#L45)

___

### subscribeEntityStream

**subscribeEntityStream**(`request`): `Stream`<`SubscribeEntityStreamResponse`\>

Returns a stream of uppdates for a single entity.

First message is a snapshot of the entity.
Subsequent messages are updates.

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | `SubscribeEntityStreamRequest` |

#### Returns

`Stream`<`SubscribeEntityStreamResponse`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/data-service-host.ts:102](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/data-service-host.ts#L102)

___

### write

**write**(`request`): `Promise`<`MutationReceipt`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | `EchoEnvelope` |

#### Returns

`Promise`<`MutationReceipt`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/data-service-host.ts:142](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/data-service-host.ts#L142)
