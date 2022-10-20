# Interface: DatabaseBackend

[@dxos/echo-db](../modules/dxos_echo_db.md).DatabaseBackend

Generic interface to represent a backend for the database.

Interfaces with ItemManager to maintain the collection of entities up-to-date.
Porvides a way to query for the write stream to make mutations.
Creates data snapshots.

## Implemented by

- [`FeedDatabaseBackend`](../classes/dxos_echo_db.FeedDatabaseBackend.md)
- [`RemoteDatabaseBackend`](../classes/dxos_echo_db.RemoteDatabaseBackend.md)

## Properties

### isReadOnly

 **isReadOnly**: `boolean`

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/database-backend.ts:30](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/database-backend.ts#L30)

## Methods

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/database-backend.ts:33](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/database-backend.ts#L33)

___

### createDataServiceHost

**createDataServiceHost**(): [`DataServiceHost`](../classes/dxos_echo_db.DataServiceHost.md)

#### Returns

[`DataServiceHost`](../classes/dxos_echo_db.DataServiceHost.md)

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/database-backend.ts:37](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/database-backend.ts#L37)

___

### createSnapshot

**createSnapshot**(): `DatabaseSnapshot`

#### Returns

`DatabaseSnapshot`

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/database-backend.ts:36](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/database-backend.ts#L36)

___

### getWriteStream

**getWriteStream**(): `undefined` \| `FeedWriter`<`EchoEnvelope`\>

#### Returns

`undefined` \| `FeedWriter`<`EchoEnvelope`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/database-backend.ts:35](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/database-backend.ts#L35)

___

### open

**open**(`itemManager`, `modelFactory`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `itemManager` | [`ItemManager`](../classes/dxos_echo_db.ItemManager.md) |
| `modelFactory` | `ModelFactory` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/database-backend.ts:32](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/database-backend.ts#L32)
