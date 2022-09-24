# Class: Database

Represents a shared dataset containing queryable Items that are constructed from an ordered stream of mutations.

## Table of contents

### Constructors

- [constructor](Database.md#constructor)

### Properties

- [\_itemManager](Database.md#_itemmanager)
- [\_state](Database.md#_state)

### Accessors

- [entityUpdate](Database.md#entityupdate)
- [isReadOnly](Database.md#isreadonly)
- [state](Database.md#state)
- [update](Database.md#update)

### Methods

- [\_assertInitialized](Database.md#_assertinitialized)
- [createDataServiceHost](Database.md#createdataservicehost)
- [createItem](Database.md#createitem)
- [createLink](Database.md#createlink)
- [createSnapshot](Database.md#createsnapshot)
- [destroy](Database.md#destroy)
- [getItem](Database.md#getitem)
- [initialize](Database.md#initialize)
- [reduce](Database.md#reduce)
- [select](Database.md#select)
- [waitForItem](Database.md#waitforitem)

## Constructors

### constructor

• **new Database**(`_modelFactory`, `_backend`, `memberKey`)

Creates a new database instance. `database.initialize()` must be called afterwards to complete the initialization.

#### Parameters

| Name | Type |
| :------ | :------ |
| `_modelFactory` | `ModelFactory` |
| `_backend` | [`DatabaseBackend`](../interfaces/DatabaseBackend.md) |
| `memberKey` | `PublicKey` |

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:54](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L54)

## Properties

### \_itemManager

• `Private` `Readonly` **\_itemManager**: [`ItemManager`](ItemManager.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:47](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L47)

___

### \_state

• `Private` **\_state**: [`State`](../enums/State.md) = `State.NULL`

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:49](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L49)

## Accessors

### entityUpdate

• `get` **entityUpdate**(): `Event`<[`Entity`](Entity.md)<`any`\>\>

Fired immediately after any update in the entities.
If the information about which entity got updated is not required prefer using `update`.

#### Returns

`Event`<[`Entity`](Entity.md)<`any`\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:83](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L83)

___

### isReadOnly

• `get` **isReadOnly**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:66](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L66)

___

### state

• `get` **state**(): [`State`](../enums/State.md)

#### Returns

[`State`](../enums/State.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:62](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L62)

___

### update

• `get` **update**(): `Event`<[`Entity`](Entity.md)<`any`\>[]\>

Fired when any item is updated.
Contains a list of all entities changed from the last update.

#### Returns

`Event`<[`Entity`](Entity.md)<`any`\>[]\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:74](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L74)

## Methods

### \_assertInitialized

▸ `Private` **_assertInitialized**(): `void`

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:210](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L210)

___

### createDataServiceHost

▸ **createDataServiceHost**(): [`DataServiceHost`](DataServiceHost.md)

#### Returns

[`DataServiceHost`](DataServiceHost.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:206](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L206)

___

### createItem

▸ **createItem**<`M`\>(`options?`): `Promise`<[`Item`](Item.md)<`M`\>\>

Creates a new item with the given queryable type and model.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model`<`any`, `any`, `M`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`CreateItemOption`](../interfaces/CreateItemOption.md)<`M`\> |

#### Returns

`Promise`<[`Item`](Item.md)<`M`\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:110](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L110)

___

### createLink

▸ **createLink**<`M`, `S`, `T`\>(`options`): `Promise`<[`Link`](Link.md)<`M`, `S`, `T`\>\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model`<`any`, `any`, `M`\> |
| `S` | extends `Model`<`any`, `any`, `S`\> |
| `T` | extends `Model`<`any`, `any`, `T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`CreateLinkOptions`](../interfaces/CreateLinkOptions.md)<`M`, `S`, `T`\> |

#### Returns

`Promise`<[`Link`](Link.md)<`M`, `S`, `T`\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:131](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L131)

___

### createSnapshot

▸ **createSnapshot**(): `DatabaseSnapshot`

#### Returns

`DatabaseSnapshot`

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:201](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L201)

___

### destroy

▸ **destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:97](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L97)

___

### getItem

▸ **getItem**(`itemId`): `undefined` \| [`Item`](Item.md)<`any`\>

Retrieves a item from the index.

#### Parameters

| Name | Type |
| :------ | :------ |
| `itemId` | `string` |

#### Returns

`undefined` \| [`Item`](Item.md)<`any`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:155](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L155)

___

### initialize

▸ **initialize**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:87](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L87)

___

### reduce

▸ **reduce**<`R`\>(`result`, `filter?`): [`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `R`\>

Returns a reducer selection context.

#### Type parameters

| Name |
| :------ |
| `R` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `result` | `R` |
| `filter?` | [`RootFilter`](../modules.md#rootfilter) |

#### Returns

[`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:191](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L191)

___

### select

▸ **select**(`filter?`): [`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `void`\>

Returns a selection context, which can be used to traverse the object graph.

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter?` | [`RootFilter`](../modules.md#rootfilter) |

#### Returns

[`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:176](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L176)

___

### waitForItem

▸ **waitForItem**<`T`\>(`filter`): `Promise`<[`Item`](Item.md)<`T`\>\>

Waits for item matching the filter to be present and returns it.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Model`<`any`, `any`, `T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter` | [`RootFilter`](../modules.md#rootfilter) |

#### Returns

`Promise`<[`Item`](Item.md)<`T`\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:164](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/database.ts#L164)
