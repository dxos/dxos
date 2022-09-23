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

[packages/echo/echo-db/src/packlets/database/database.ts:54](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L54)

## Properties

### \_itemManager

• `Private` `Readonly` **\_itemManager**: [`ItemManager`](dxos_echo_db.ItemManager.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:47](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L47)

___

### \_state

• `Private` **\_state**: [`State`](../enums/dxos_echo_db.State.md) = `State.NULL`

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:49](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L49)

## Accessors

### entityUpdate

• `get` **entityUpdate**(): `Event`<[`Entity`](dxos_echo_db.Entity.md)<`any`\>\>

Fired immediately after any update in the entities.
If the information about which entity got updated is not required prefer using `update`.

#### Returns

`Event`<[`Entity`](dxos_echo_db.Entity.md)<`any`\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:83](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L83)

___

### isReadOnly

• `get` **isReadOnly**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:66](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L66)

___

### state

• `get` **state**(): [`State`](../enums/dxos_echo_db.State.md)

#### Returns

[`State`](../enums/dxos_echo_db.State.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:62](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L62)

___

### update

• `get` **update**(): `Event`<[`Entity`](dxos_echo_db.Entity.md)<`any`\>[]\>

Fired when any item is updated.
Contains a list of all entities changed from the last update.

#### Returns

`Event`<[`Entity`](dxos_echo_db.Entity.md)<`any`\>[]\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:74](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L74)

## Methods

### \_assertInitialized

▸ `Private` **_assertInitialized**(): `void`

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:210](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L210)

___

### createDataServiceHost

▸ **createDataServiceHost**(): [`DataServiceHost`](dxos_echo_db.DataServiceHost.md)

#### Returns

[`DataServiceHost`](dxos_echo_db.DataServiceHost.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:206](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L206)

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

[packages/echo/echo-db/src/packlets/database/database.ts:110](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L110)

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

[packages/echo/echo-db/src/packlets/database/database.ts:131](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L131)

___

### createSnapshot

▸ **createSnapshot**(): `DatabaseSnapshot`

#### Returns

`DatabaseSnapshot`

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:201](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L201)

___

### destroy

▸ **destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:97](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L97)

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

[packages/echo/echo-db/src/packlets/database/database.ts:155](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L155)

___

### initialize

▸ **initialize**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/database.ts:87](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L87)

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

[packages/echo/echo-db/src/packlets/database/database.ts:191](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L191)

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

[packages/echo/echo-db/src/packlets/database/database.ts:176](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L176)

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

[packages/echo/echo-db/src/packlets/database/database.ts:164](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/database.ts#L164)
