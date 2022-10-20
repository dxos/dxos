# Class: FeedDatabaseBackend

[@dxos/echo-db](../modules/dxos_echo_db.md).FeedDatabaseBackend

Database backend that operates on two streams: read and write.

Mutations are read from the incoming streams and applied to the ItemManager via ItemDemuxer.
Write operations result in mutations being written to the outgoing stream.

## Implements

- [`DatabaseBackend`](../interfaces/dxos_echo_db.DatabaseBackend.md)

## Constructors

### constructor

**new FeedDatabaseBackend**(`_outboundStream`, `_snapshot?`, `_options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_outboundStream` | `undefined` \| `FeedWriter`<`EchoEnvelope`\> |
| `_snapshot?` | `DatabaseSnapshot` |
| `_options` | [`ItemDemuxerOptions`](../interfaces/dxos_echo_db.ItemDemuxerOptions.md) |

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:49](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L49)

## Properties

### \_echoProcessor

 `Private` **\_echoProcessor**: [`EchoProcessor`](../types/dxos_echo_db.EchoProcessor.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:45](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L45)

___

### \_itemDemuxer

 `Private` **\_itemDemuxer**: [`ItemDemuxer`](dxos_echo_db.ItemDemuxer.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:47](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L47)

___

### \_itemManager

 `Private` **\_itemManager**: [`ItemManager`](dxos_echo_db.ItemManager.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:46](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L46)

## Accessors

### echoProcessor

`get` **echoProcessor**(): [`EchoProcessor`](../types/dxos_echo_db.EchoProcessor.md)

#### Returns

[`EchoProcessor`](../types/dxos_echo_db.EchoProcessor.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:65](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L65)

___

### isReadOnly

`get` **isReadOnly**(): `boolean`

#### Returns

`boolean`

#### Implementation of

[DatabaseBackend](../interfaces/dxos_echo_db.DatabaseBackend.md).[isReadOnly](../interfaces/dxos_echo_db.DatabaseBackend.md#isreadonly)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:72](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L72)

## Methods

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[DatabaseBackend](../interfaces/dxos_echo_db.DatabaseBackend.md).[close](../interfaces/dxos_echo_db.DatabaseBackend.md#close)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:69](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L69)

___

### createDataServiceHost

**createDataServiceHost**(): [`DataServiceHost`](dxos_echo_db.DataServiceHost.md)

#### Returns

[`DataServiceHost`](dxos_echo_db.DataServiceHost.md)

#### Implementation of

[DatabaseBackend](../interfaces/dxos_echo_db.DatabaseBackend.md).[createDataServiceHost](../interfaces/dxos_echo_db.DatabaseBackend.md#createdataservicehost)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:84](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L84)

___

### createSnapshot

**createSnapshot**(): `DatabaseSnapshot`

#### Returns

`DatabaseSnapshot`

#### Implementation of

[DatabaseBackend](../interfaces/dxos_echo_db.DatabaseBackend.md).[createSnapshot](../interfaces/dxos_echo_db.DatabaseBackend.md#createsnapshot)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:80](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L80)

___

### getWriteStream

**getWriteStream**(): `undefined` \| `FeedWriter`<`EchoEnvelope`\>

#### Returns

`undefined` \| `FeedWriter`<`EchoEnvelope`\>

#### Implementation of

[DatabaseBackend](../interfaces/dxos_echo_db.DatabaseBackend.md).[getWriteStream](../interfaces/dxos_echo_db.DatabaseBackend.md#getwritestream)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:76](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L76)

___

### open

**open**(`itemManager`, `modelFactory`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `itemManager` | [`ItemManager`](dxos_echo_db.ItemManager.md) |
| `modelFactory` | `ModelFactory` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[DatabaseBackend](../interfaces/dxos_echo_db.DatabaseBackend.md).[open](../interfaces/dxos_echo_db.DatabaseBackend.md#open)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:55](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L55)
