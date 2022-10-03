# Class: RemoteDatabaseBackend

[@dxos/echo-db](../modules/dxos_echo_db.md).RemoteDatabaseBackend

Database backend that is backed by the DataService instance.

Uses DataMirror to populate entities in ItemManager.

## Implements

- [`DatabaseBackend`](../interfaces/dxos_echo_db.DatabaseBackend.md)

## Constructors

### constructor

**new RemoteDatabaseBackend**(`_service`, `_partyKey`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_service` | `DataService` |
| `_partyKey` | `PublicKey` |

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:101](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L101)

## Properties

### \_itemManager

 `Private` **\_itemManager**: [`ItemManager`](dxos_echo_db.ItemManager.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:99](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L99)

## Accessors

### isReadOnly

`get` **isReadOnly**(): `boolean`

#### Returns

`boolean`

#### Implementation of

[DatabaseBackend](../interfaces/dxos_echo_db.DatabaseBackend.md).[isReadOnly](../interfaces/dxos_echo_db.DatabaseBackend.md#isreadonly)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:118](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L118)

## Methods

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[DatabaseBackend](../interfaces/dxos_echo_db.DatabaseBackend.md).[close](../interfaces/dxos_echo_db.DatabaseBackend.md#close)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:114](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L114)

___

### createDataServiceHost

**createDataServiceHost**(): [`DataServiceHost`](dxos_echo_db.DataServiceHost.md)

#### Returns

[`DataServiceHost`](dxos_echo_db.DataServiceHost.md)

#### Implementation of

[DatabaseBackend](../interfaces/dxos_echo_db.DatabaseBackend.md).[createDataServiceHost](../interfaces/dxos_echo_db.DatabaseBackend.md#createdataservicehost)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:141](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L141)

___

### createSnapshot

**createSnapshot**(): `DatabaseSnapshot`

#### Returns

`DatabaseSnapshot`

#### Implementation of

[DatabaseBackend](../interfaces/dxos_echo_db.DatabaseBackend.md).[createSnapshot](../interfaces/dxos_echo_db.DatabaseBackend.md#createsnapshot)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:137](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L137)

___

### getWriteStream

**getWriteStream**(): `undefined` \| `FeedWriter`<`EchoEnvelope`\>

#### Returns

`undefined` \| `FeedWriter`<`EchoEnvelope`\>

#### Implementation of

[DatabaseBackend](../interfaces/dxos_echo_db.DatabaseBackend.md).[getWriteStream](../interfaces/dxos_echo_db.DatabaseBackend.md#getwritestream)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:122](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L122)

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

[packages/echo/echo-db/src/packlets/database/database-backend.ts:106](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/database-backend.ts#L106)
