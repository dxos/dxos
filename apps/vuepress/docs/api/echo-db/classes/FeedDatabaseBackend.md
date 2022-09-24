# Class: FeedDatabaseBackend

Database backend that operates on two streams: read and write.

Mutations are read from the incoming streams and applied to the ItemManager via ItemDemuxer.
Write operations result in mutations being written to the outgoing stream.

## Implements

- [`DatabaseBackend`](../interfaces/DatabaseBackend.md)

## Table of contents

### Constructors

- [constructor](FeedDatabaseBackend.md#constructor)

### Properties

- [\_echoProcessor](FeedDatabaseBackend.md#_echoprocessor)
- [\_itemDemuxer](FeedDatabaseBackend.md#_itemdemuxer)
- [\_itemManager](FeedDatabaseBackend.md#_itemmanager)

### Accessors

- [echoProcessor](FeedDatabaseBackend.md#echoprocessor)
- [isReadOnly](FeedDatabaseBackend.md#isreadonly)

### Methods

- [close](FeedDatabaseBackend.md#close)
- [createDataServiceHost](FeedDatabaseBackend.md#createdataservicehost)
- [createSnapshot](FeedDatabaseBackend.md#createsnapshot)
- [getWriteStream](FeedDatabaseBackend.md#getwritestream)
- [open](FeedDatabaseBackend.md#open)

## Constructors

### constructor

• **new FeedDatabaseBackend**(`_outboundStream`, `_snapshot?`, `_options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_outboundStream` | `undefined` \| `FeedWriter`<`EchoEnvelope`\> |
| `_snapshot?` | `DatabaseSnapshot` |
| `_options` | [`ItemDemuxerOptions`](../interfaces/ItemDemuxerOptions.md) |

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:49](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L49)

## Properties

### \_echoProcessor

• `Private` **\_echoProcessor**: [`EchoProcessor`](../modules.md#echoprocessor)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:45](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L45)

___

### \_itemDemuxer

• `Private` **\_itemDemuxer**: [`ItemDemuxer`](ItemDemuxer.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:47](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L47)

___

### \_itemManager

• `Private` **\_itemManager**: [`ItemManager`](ItemManager.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:46](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L46)

## Accessors

### echoProcessor

• `get` **echoProcessor**(): [`EchoProcessor`](../modules.md#echoprocessor)

#### Returns

[`EchoProcessor`](../modules.md#echoprocessor)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:65](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L65)

___

### isReadOnly

• `get` **isReadOnly**(): `boolean`

#### Returns

`boolean`

#### Implementation of

[DatabaseBackend](../interfaces/DatabaseBackend.md).[isReadOnly](../interfaces/DatabaseBackend.md#isreadonly)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:72](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L72)

## Methods

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[DatabaseBackend](../interfaces/DatabaseBackend.md).[close](../interfaces/DatabaseBackend.md#close)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:69](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L69)

___

### createDataServiceHost

▸ **createDataServiceHost**(): [`DataServiceHost`](DataServiceHost.md)

#### Returns

[`DataServiceHost`](DataServiceHost.md)

#### Implementation of

[DatabaseBackend](../interfaces/DatabaseBackend.md).[createDataServiceHost](../interfaces/DatabaseBackend.md#createdataservicehost)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:84](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L84)

___

### createSnapshot

▸ **createSnapshot**(): `DatabaseSnapshot`

#### Returns

`DatabaseSnapshot`

#### Implementation of

[DatabaseBackend](../interfaces/DatabaseBackend.md).[createSnapshot](../interfaces/DatabaseBackend.md#createsnapshot)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:80](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L80)

___

### getWriteStream

▸ **getWriteStream**(): `undefined` \| `FeedWriter`<`EchoEnvelope`\>

#### Returns

`undefined` \| `FeedWriter`<`EchoEnvelope`\>

#### Implementation of

[DatabaseBackend](../interfaces/DatabaseBackend.md).[getWriteStream](../interfaces/DatabaseBackend.md#getwritestream)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:76](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L76)

___

### open

▸ **open**(`itemManager`, `modelFactory`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `itemManager` | [`ItemManager`](ItemManager.md) |
| `modelFactory` | `ModelFactory` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[DatabaseBackend](../interfaces/DatabaseBackend.md).[open](../interfaces/DatabaseBackend.md#open)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:55](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L55)
