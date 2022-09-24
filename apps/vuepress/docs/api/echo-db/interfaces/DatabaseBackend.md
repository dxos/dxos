# Interface: DatabaseBackend

Generic interface to represent a backend for the database.

Interfaces with ItemManager to maintain the collection of entities up-to-date.
Porvides a way to query for the write stream to make mutations.
Creates data snapshots.

## Implemented by

- [`FeedDatabaseBackend`](../classes/FeedDatabaseBackend.md)
- [`RemoteDatabaseBackend`](../classes/RemoteDatabaseBackend.md)

## Table of contents

### Properties

- [isReadOnly](DatabaseBackend.md#isreadonly)

### Methods

- [close](DatabaseBackend.md#close)
- [createDataServiceHost](DatabaseBackend.md#createdataservicehost)
- [createSnapshot](DatabaseBackend.md#createsnapshot)
- [getWriteStream](DatabaseBackend.md#getwritestream)
- [open](DatabaseBackend.md#open)

## Properties

### isReadOnly

• **isReadOnly**: `boolean`

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:32](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L32)

## Methods

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:30](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L30)

___

### createDataServiceHost

▸ **createDataServiceHost**(): [`DataServiceHost`](../classes/DataServiceHost.md)

#### Returns

[`DataServiceHost`](../classes/DataServiceHost.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:35](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L35)

___

### createSnapshot

▸ **createSnapshot**(): `DatabaseSnapshot`

#### Returns

`DatabaseSnapshot`

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:34](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L34)

___

### getWriteStream

▸ **getWriteStream**(): `undefined` \| `FeedWriter`<`EchoEnvelope`\>

#### Returns

`undefined` \| `FeedWriter`<`EchoEnvelope`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:33](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L33)

___

### open

▸ **open**(`itemManager`, `modelFactory`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `itemManager` | [`ItemManager`](../classes/ItemManager.md) |
| `modelFactory` | `ModelFactory` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:29](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L29)
