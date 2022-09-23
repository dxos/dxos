---
id: "dxos_echo_db.ItemManager"
title: "Class: ItemManager"
sidebar_label: "ItemManager"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).ItemManager

Manages the creation and indexing of items.

## Constructors

### constructor

• **new ItemManager**(`_modelFactory`, `_memberKey`, `_writeStream?`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_modelFactory` | `ModelFactory` |  |
| `_memberKey` | `PublicKey` | - |
| `_writeStream?` | `FeedWriter`<`EchoEnvelope`\> | Outbound `dxos.echo.IEchoEnvelope` mutation stream. |

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:72](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L72)

## Properties

### \_entities

• `Private` `Readonly` **\_entities**: `Map`<`string`, [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>\>

Map of active items.

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:60](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L60)

___

### \_pendingItems

• `Private` `Readonly` **\_pendingItems**: `Map`<`string`, (`item`: [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>) => `void`\>

Map of item promises (waiting for item construction after genesis message has been written).

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:66](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L66)

___

### debouncedUpdate

• `Readonly` **debouncedUpdate**: `Event`<[`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>[]\>

Update event.
Contains a list of all entities changed from the last update.

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:54](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L54)

___

### update

• `Readonly` **update**: `Event`<[`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>\>

Fired immediately after any update in the entities.

If the information about which entity got updated is not required prefer using `debouncedItemUpdate`.

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:48](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L48)

## Accessors

### entities

• `get` **entities**(): `Map`<`string`, [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>\>

#### Returns

`Map`<`string`, [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:78](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L78)

___

### items

• `get` **items**(): [`Item`](dxos_echo_db.Item.md)<`any`\>[]

#### Returns

[`Item`](dxos_echo_db.Item.md)<`any`\>[]

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:82](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L82)

___

### links

• `get` **links**(): [`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>[]

#### Returns

[`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>[]

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:86](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L86)

## Methods

### \_addEntity

▸ `Private` **_addEntity**(`entity`, `parent?`): `void`

Adds new entity to the tracked set. Sets up events and notifies any listeners waiting for this entity to be constructed.

#### Parameters

| Name | Type |
| :------ | :------ |
| `entity` | [`Entity`](dxos_echo_db.Entity.md)<`any`\> |
| `parent?` | ``null`` \| [`Item`](dxos_echo_db.Item.md)<`any`\> |

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:205](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L205)

___

### \_constructModel

▸ `Private` **_constructModel**(`__namedParameters`): `Promise`<`StateManager`<`Model`<`any`, `any`\>\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ModelConstructionOptions`](../interfaces/dxos_echo_db.ModelConstructionOptions.md) |

#### Returns

`Promise`<`StateManager`<`Model`<`any`, `any`\>\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:190](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L190)

___

### constructItem

▸ **constructItem**(`__namedParameters`): `Promise`<[`Item`](dxos_echo_db.Item.md)<`any`\>\>

Constructs an item with the appropriate model.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ItemConstructionOptions`](../interfaces/dxos_echo_db.ItemConstructionOptions.md) |

#### Returns

`Promise`<[`Item`](dxos_echo_db.Item.md)<`any`\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:226](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L226)

___

### constructLink

▸ **constructLink**(`__namedParameters`): `Promise`<[`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>\>

Constructs an item with the appropriate model.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`LinkConstructionOptions`](../interfaces/dxos_echo_db.LinkConstructionOptions.md) |

#### Returns

`Promise`<[`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:261](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L261)

___

### createItem

▸ **createItem**(`modelType`, `itemType?`, `parentId?`, `initProps?`): `Promise`<[`Item`](dxos_echo_db.Item.md)<`Model`<`unknown`, `any`\>\>\>

Creates an item and writes the genesis message.

#### Parameters

| Name | Type |
| :------ | :------ |
| `modelType` | `string` |
| `itemType?` | `string` |
| `parentId?` | `string` |
| `initProps?` | `any` |

#### Returns

`Promise`<[`Item`](dxos_echo_db.Item.md)<`Model`<`unknown`, `any`\>\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:97](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L97)

___

### createLink

▸ **createLink**(`modelType`, `itemType`, `source`, `target`, `initProps?`): `Promise`<[`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `modelType` | `string` |
| `itemType` | `undefined` \| `string` |
| `source` | `string` |
| `target` | `string` |
| `initProps?` | `any` |

#### Returns

`Promise`<[`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:145](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L145)

___

### deconstructItem

▸ **deconstructItem**(`itemId`): `void`

Recursive method to unlink and remove items from the active set.

#### Parameters

| Name | Type |
| :------ | :------ |
| `itemId` | `string` |

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:336](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L336)

___

### getItem

▸ **getItem**<`M`\>(`itemId`): `undefined` \| [`Item`](dxos_echo_db.Item.md)<`M`\>

Retrieves a item from the index.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model`<`any`, `any`, `M`\> = `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `itemId` | `string` |

#### Returns

`undefined` \| [`Item`](dxos_echo_db.Item.md)<`M`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:320](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L320)

___

### getUninitializedEntities

▸ **getUninitializedEntities**(): [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>[]

#### Returns

[`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>[]

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:328](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L328)

___

### initializeModel

▸ **initializeModel**(`itemId`): `Promise`<`void`\>

Reconstruct an item with a default model when that model becomes registered.
New model instance is created and streams are reconnected.

#### Parameters

| Name | Type |
| :------ | :------ |
| `itemId` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:365](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L365)

___

### processModelMessage

▸ **processModelMessage**(`itemId`, `message`): `Promise`<`void`\>

Process a message directed to a specific model.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `itemId` | `string` | Id of the item containing the model. |
| `message` | `ModelMessage`<`Uint8Array`\> | Encoded model message |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:308](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-manager.ts#L308)
