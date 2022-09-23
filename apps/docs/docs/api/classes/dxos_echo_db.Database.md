---
id: "dxos_echo_db.Database"
title: "Class: Database"
sidebar_label: "Database"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).Database

Represents a shared dataset containing queryable Items that are constructed from an ordered stream of mutations.

## Constructors

### constructor

• **new Database**(`_modelFactory`, `_backend`, `memberKey`)

Creates a new database instance. `database.initialize()` must be called afterwards to complete the initialization.

#### Parameters

| Name | Type |
| :------ | :------ |
| `_modelFactory` | `ModelFactory` |
| `_backend` | [`DatabaseBackend`](../interfaces/dxos_echo_db.DatabaseBackend.md) |
| `memberKey` | `PublicKey` |

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:53](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L53)

## Properties

### \_itemManager

• `Private` `Readonly` **\_itemManager**: [`ItemManager`](dxos_echo_db.ItemManager.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:46](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L46)

___

### \_state

• `Private` **\_state**: [`State`](../enums/dxos_echo_db.State.md) = `State.NULL`

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:48](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L48)

## Accessors

### entityUpdate

• `get` **entityUpdate**(): `Event`<[`Entity`](dxos_echo_db.Entity.md)<`any`\>\>

Fired immediately after any update in the entities.
If the information about which entity got updated is not required prefer using `update`.

#### Returns

`Event`<[`Entity`](dxos_echo_db.Entity.md)<`any`\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:82](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L82)

___

### isReadOnly

• `get` **isReadOnly**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:65](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L65)

___

### state

• `get` **state**(): [`State`](../enums/dxos_echo_db.State.md)

#### Returns

[`State`](../enums/dxos_echo_db.State.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:61](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L61)

___

### update

• `get` **update**(): `Event`<[`Entity`](dxos_echo_db.Entity.md)<`any`\>[]\>

Fired when any item is updated.
Contains a list of all entities changed from the last update.

#### Returns

`Event`<[`Entity`](dxos_echo_db.Entity.md)<`any`\>[]\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:73](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L73)

## Methods

### \_assertInitialized

▸ `Private` **_assertInitialized**(): `void`

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:209](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L209)

___

### createDataServiceHost

▸ **createDataServiceHost**(): [`DataServiceHost`](dxos_echo_db.DataServiceHost.md)

#### Returns

[`DataServiceHost`](dxos_echo_db.DataServiceHost.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:205](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L205)

___

### createItem

▸ **createItem**<`M`\>(`options?`): `Promise`<[`Item`](dxos_echo_db.Item.md)<`M`\>\>

Creates a new item with the given queryable type and model.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model`<`any`, `any`, `M`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`CreateItemOption`](../interfaces/dxos_echo_db.CreateItemOption.md)<`M`\> |

#### Returns

`Promise`<[`Item`](dxos_echo_db.Item.md)<`M`\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:109](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L109)

___

### createLink

▸ **createLink**<`M`, `S`, `T`\>(`options`): `Promise`<[`Link`](dxos_echo_db.Link.md)<`M`, `S`, `T`\>\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model`<`any`, `any`, `M`\> |
| `S` | extends `Model`<`any`, `any`, `S`\> |
| `T` | extends `Model`<`any`, `any`, `T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`CreateLinkOptions`](../interfaces/dxos_echo_db.CreateLinkOptions.md)<`M`, `S`, `T`\> |

#### Returns

`Promise`<[`Link`](dxos_echo_db.Link.md)<`M`, `S`, `T`\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:130](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L130)

___

### createSnapshot

▸ **createSnapshot**(): `DatabaseSnapshot`

#### Returns

`DatabaseSnapshot`

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:200](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L200)

___

### destroy

▸ **destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:96](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L96)

___

### getItem

▸ **getItem**(`itemId`): `undefined` \| [`Item`](dxos_echo_db.Item.md)<`any`\>

Retrieves a item from the index.

#### Parameters

| Name | Type |
| :------ | :------ |
| `itemId` | `string` |

#### Returns

`undefined` \| [`Item`](dxos_echo_db.Item.md)<`any`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:154](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L154)

___

### initialize

▸ **initialize**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:86](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L86)

___

### reduce

▸ **reduce**<`R`\>(`result`, `filter?`): [`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `R`\>

Returns a reducer selection context.

#### Type parameters

| Name |
| :------ |
| `R` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `result` | `R` |
| `filter?` | [`RootFilter`](../modules/dxos_echo_db.md#rootfilter) |

#### Returns

[`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:190](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L190)

___

### select

▸ **select**(`filter?`): [`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `void`\>

Returns a selection context, which can be used to traverse the object graph.

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter?` | [`RootFilter`](../modules/dxos_echo_db.md#rootfilter) |

#### Returns

[`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:175](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L175)

___

### waitForItem

▸ **waitForItem**<`T`\>(`filter`): `Promise`<[`Item`](dxos_echo_db.Item.md)<`T`\>\>

Waits for item matching the filter to be present and returns it.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Model`<`any`, `any`, `T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter` | [`RootFilter`](../modules/dxos_echo_db.md#rootfilter) |

#### Returns

`Promise`<[`Item`](dxos_echo_db.Item.md)<`T`\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:163](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/database.ts#L163)
