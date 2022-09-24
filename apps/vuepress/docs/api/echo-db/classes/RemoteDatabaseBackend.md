# Class: RemoteDatabaseBackend

Database backend that is backed by the DataService instance.

Uses DataMirror to populate entities in ItemManager.

## Implements

- [`DatabaseBackend`](../interfaces/DatabaseBackend.md)

## Table of contents

### Constructors

- [constructor](RemoteDatabaseBackend.md#constructor)

### Properties

- [\_itemManager](RemoteDatabaseBackend.md#_itemmanager)

### Accessors

- [isReadOnly](RemoteDatabaseBackend.md#isreadonly)

### Methods

- [close](RemoteDatabaseBackend.md#close)
- [createDataServiceHost](RemoteDatabaseBackend.md#createdataservicehost)
- [createSnapshot](RemoteDatabaseBackend.md#createsnapshot)
- [getWriteStream](RemoteDatabaseBackend.md#getwritestream)
- [open](RemoteDatabaseBackend.md#open)

## Constructors

### constructor

• **new RemoteDatabaseBackend**(`_service`, `_partyKey`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_service` | `DataService` |
| `_partyKey` | `PublicKey` |

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:101](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L101)

## Properties

### \_itemManager

• `Private` **\_itemManager**: [`ItemManager`](ItemManager.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:99](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L99)

## Accessors

### isReadOnly

• `get` **isReadOnly**(): `boolean`

#### Returns

`boolean`

#### Implementation of

[DatabaseBackend](../interfaces/DatabaseBackend.md).[isReadOnly](../interfaces/DatabaseBackend.md#isreadonly)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:118](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L118)

## Methods

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[DatabaseBackend](../interfaces/DatabaseBackend.md).[close](../interfaces/DatabaseBackend.md#close)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:114](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L114)

___

### createDataServiceHost

▸ **createDataServiceHost**(): [`DataServiceHost`](DataServiceHost.md)

#### Returns

[`DataServiceHost`](DataServiceHost.md)

#### Implementation of

[DatabaseBackend](../interfaces/DatabaseBackend.md).[createDataServiceHost](../interfaces/DatabaseBackend.md#createdataservicehost)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:141](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L141)

___

### createSnapshot

▸ **createSnapshot**(): `DatabaseSnapshot`

#### Returns

`DatabaseSnapshot`

#### Implementation of

[DatabaseBackend](../interfaces/DatabaseBackend.md).[createSnapshot](../interfaces/DatabaseBackend.md#createsnapshot)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:137](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L137)

___

### getWriteStream

▸ **getWriteStream**(): `undefined` \| `FeedWriter`<`EchoEnvelope`\>

#### Returns

`undefined` \| `FeedWriter`<`EchoEnvelope`\>

#### Implementation of

[DatabaseBackend](../interfaces/DatabaseBackend.md).[getWriteStream](../interfaces/DatabaseBackend.md#getwritestream)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database-backend.ts:122](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L122)

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

[packages/echo/echo-db/src/packlets/database/database-backend.ts:106](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database-backend.ts#L106)
