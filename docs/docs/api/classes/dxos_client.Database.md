# Class: Database

[@dxos/client](../modules/dxos_client.md).Database

Represents a shared dataset containing queryable Items that are constructed from an ordered stream of mutations.

## Constructors

### constructor

**new Database**(`_modelFactory`, `_backend`, `member_key`)

Creates a new database instance. `database.initialize()` must be called afterwards to complete the initialization.

#### Parameters

| Name | Type |
| :------ | :------ |
| `_modelFactory` | `ModelFactory` |
| `_backend` | `DatabaseBackend` |
| `member_key` | [`PublicKey`](dxos_client.PublicKey.md) |

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:41

## Properties

### \_assertInitialized

 `Private` **\_assertInitialized**: `any`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:83

___

### \_backend

 `Private` `Readonly` **\_backend**: `any`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:35

___

### \_itemManager

 `Private` `Readonly` **\_itemManager**: `any`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:36

___

### \_modelFactory

 `Private` `Readonly` **\_modelFactory**: `any`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:34

___

### \_state

 `Private` **\_state**: `any`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:37

## Accessors

### entityUpdate

`get` **entityUpdate**(): `Event`<[`Entity`](dxos_client.Entity.md)<`any`\>\>

Fired immediately after any update in the entities.
If the information about which entity got updated is not required prefer using `update`.

#### Returns

`Event`<[`Entity`](dxos_client.Entity.md)<`any`\>\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:53

___

### isReadOnly

`get` **isReadOnly**(): `boolean`

#### Returns

`boolean`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:43

___

### state

`get` **state**(): `State`

#### Returns

`State`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:42

___

### update

`get` **update**(): `Event`<[`Entity`](dxos_client.Entity.md)<`any`\>[]\>

Fired when any item is updated.
Contains a list of all entities changed from the last update.

#### Returns

`Event`<[`Entity`](dxos_client.Entity.md)<`any`\>[]\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:48

## Methods

### createDataServiceHost

**createDataServiceHost**(): `DataServiceHost`

#### Returns

`DataServiceHost`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:82

___

### createItem

**createItem**<`M`\>(`options?`): `Promise`<[`Item`](dxos_client.Item.md)<`M`\>\>

Creates a new item with the given queryable type and model.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model`<`any`, `any`, `M`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | `CreateItemOption`<`M`\> |

#### Returns

`Promise`<[`Item`](dxos_client.Item.md)<`M`\>\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:59

___

### createLink

**createLink**<`M`, `S`, `T`\>(`options`): `Promise`<[`Link`](dxos_client.Link.md)<`M`, `S`, `T`\>\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model`<`any`, `any`, `M`\> |
| `S` | extends `Model`<`any`, `any`, `S`\> |
| `T` | extends `Model`<`any`, `any`, `T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `CreateLinkOptions`<`M`, `S`, `T`\> |

#### Returns

`Promise`<[`Link`](dxos_client.Link.md)<`M`, `S`, `T`\>\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:60

___

### createSnapshot

**createSnapshot**(): `DatabaseSnapshot`

#### Returns

`DatabaseSnapshot`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:81

___

### destroy

**destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:55

___

### getItem

**getItem**(`item_id`): `undefined` \| [`Item`](dxos_client.Item.md)<`any`\>

Retrieves a item from the index.

#### Parameters

| Name | Type |
| :------ | :------ |
| `item_id` | `string` |

#### Returns

`undefined` \| [`Item`](dxos_client.Item.md)<`any`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:65

___

### initialize

**initialize**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:54

___

### reduce

**reduce**<`R`\>(`result`, `filter?`): [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\>

Returns a reducer selection context.

#### Type parameters

| Name |
| :------ |
| `R` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `result` | `R` |
| `filter?` | `RootFilter` |

#### Returns

[`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:80

___

### select

**select**(`filter?`): [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `void`\>

Returns a selection context, which can be used to traverse the object graph.

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter?` | `RootFilter` |

#### Returns

[`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `void`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:74

___

### waitForItem

**waitForItem**<`T`\>(`filter`): `Promise`<[`Item`](dxos_client.Item.md)<`T`\>\>

Waits for item matching the filter to be present and returns it.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Model`<`any`, `any`, `T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter` | `RootFilter` |

#### Returns

`Promise`<[`Item`](dxos_client.Item.md)<`T`\>\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:69
