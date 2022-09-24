# Class: ItemManager

[@dxos/echo-db](../modules/dxos_echo_db.md).ItemManager

Manages the creation and indexing of items.

## Table of contents

### Constructors

- [constructor](dxos_echo_db.ItemManager.md#constructor)

### Properties

- [\_entities](dxos_echo_db.ItemManager.md#_entities)
- [\_pendingItems](dxos_echo_db.ItemManager.md#_pendingitems)
- [debouncedUpdate](dxos_echo_db.ItemManager.md#debouncedupdate)
- [update](dxos_echo_db.ItemManager.md#update)

### Accessors

- [entities](dxos_echo_db.ItemManager.md#entities)
- [items](dxos_echo_db.ItemManager.md#items)
- [links](dxos_echo_db.ItemManager.md#links)

### Methods

- [\_addEntity](dxos_echo_db.ItemManager.md#_addentity)
- [\_constructModel](dxos_echo_db.ItemManager.md#_constructmodel)
- [constructItem](dxos_echo_db.ItemManager.md#constructitem)
- [constructLink](dxos_echo_db.ItemManager.md#constructlink)
- [createItem](dxos_echo_db.ItemManager.md#createitem)
- [createLink](dxos_echo_db.ItemManager.md#createlink)
- [deconstructItem](dxos_echo_db.ItemManager.md#deconstructitem)
- [getItem](dxos_echo_db.ItemManager.md#getitem)
- [getUninitializedEntities](dxos_echo_db.ItemManager.md#getuninitializedentities)
- [initializeModel](dxos_echo_db.ItemManager.md#initializemodel)
- [processModelMessage](dxos_echo_db.ItemManager.md#processmodelmessage)

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

[packages/echo/echo-db/src/packlets/database/item-manager.ts:74](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L74)

## Properties

### \_entities

• `Private` `Readonly` **\_entities**: `Map`<`string`, [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>\>

Map of active items.

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:62](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L62)

___

### \_pendingItems

• `Private` `Readonly` **\_pendingItems**: `Map`<`string`, (`item`: [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>) => `void`\>

Map of item promises (waiting for item construction after genesis message has been written).

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:68](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L68)

___

### debouncedUpdate

• `Readonly` **debouncedUpdate**: `Event`<[`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>[]\>

Update event.
Contains a list of all entities changed from the last update.

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:56](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L56)

___

### update

• `Readonly` **update**: `Event`<[`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>\>

Fired immediately after any update in the entities.

If the information about which entity got updated is not required prefer using `debouncedItemUpdate`.

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:50](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L50)

## Accessors

### entities

• `get` **entities**(): `Map`<`string`, [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>\>

#### Returns

`Map`<`string`, [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:80](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L80)

___

### items

• `get` **items**(): [`Item`](dxos_echo_db.Item.md)<`any`\>[]

#### Returns

[`Item`](dxos_echo_db.Item.md)<`any`\>[]

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:84](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L84)

___

### links

• `get` **links**(): [`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>[]

#### Returns

[`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>[]

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:88](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L88)

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

[packages/echo/echo-db/src/packlets/database/item-manager.ts:207](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L207)

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

[packages/echo/echo-db/src/packlets/database/item-manager.ts:192](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L192)

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

[packages/echo/echo-db/src/packlets/database/item-manager.ts:228](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L228)

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

[packages/echo/echo-db/src/packlets/database/item-manager.ts:263](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L263)

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

[packages/echo/echo-db/src/packlets/database/item-manager.ts:99](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L99)

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

[packages/echo/echo-db/src/packlets/database/item-manager.ts:147](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L147)

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

[packages/echo/echo-db/src/packlets/database/item-manager.ts:338](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L338)

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

[packages/echo/echo-db/src/packlets/database/item-manager.ts:322](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L322)

___

### getUninitializedEntities

▸ **getUninitializedEntities**(): [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>[]

#### Returns

[`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>[]

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-manager.ts:330](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L330)

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

[packages/echo/echo-db/src/packlets/database/item-manager.ts:367](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L367)

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

[packages/echo/echo-db/src/packlets/database/item-manager.ts:310](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/database/item-manager.ts#L310)
