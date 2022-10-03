# Class: ItemManager

[@dxos/echo-db](../modules/dxos_echo_db.md).ItemManager

Manages the creation and indexing of items.

## Constructors

### constructor

**new ItemManager**(`_modelFactory`, `_memberKey`, `_writeStream?`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_modelFactory` | `ModelFactory` |  |
| `_memberKey` | `PublicKey` | - |
| `_writeStream?` | `FeedWriter`<`EchoEnvelope`\> | Outbound `dxos.echo.IEchoEnvelope` mutation stream. |

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:75](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L75)

## Properties

### \_entities

 `Private` `Readonly` **\_entities**: `Map`<`string`, [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>\>

Map of active items.

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:63](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L63)

___

### \_pendingItems

 `Private` `Readonly` **\_pendingItems**: `Map`<`string`, (`item`: [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>) => `void`\>

Map of item promises (waiting for item construction after genesis message has been written).

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:69](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L69)

___

### debouncedUpdate

 `Readonly` **debouncedUpdate**: `Event`<[`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>[]\>

Update event.
Contains a list of all entities changed from the last update.

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:57](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L57)

___

### update

 `Readonly` **update**: `Event`<[`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>\>

Fired immediately after any update in the entities.

If the information about which entity got updated is not required prefer using `debouncedItemUpdate`.

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:51](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L51)

## Accessors

### entities

`get` **entities**(): `Map`<`string`, [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>\>

#### Returns

`Map`<`string`, [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:81](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L81)

___

### items

`get` **items**(): [`Item`](dxos_echo_db.Item.md)<`any`\>[]

#### Returns

[`Item`](dxos_echo_db.Item.md)<`any`\>[]

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:85](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L85)

___

### links

`get` **links**(): [`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>[]

#### Returns

[`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>[]

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:89](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L89)

## Methods

### \_addEntity

`Private` **_addEntity**(`entity`, `parent?`): `void`

Adds new entity to the tracked set. Sets up events and notifies any listeners waiting for this entity to be constructed.

#### Parameters

| Name | Type |
| :------ | :------ |
| `entity` | [`Entity`](dxos_echo_db.Entity.md)<`any`\> |
| `parent?` | ``null`` \| [`Item`](dxos_echo_db.Item.md)<`any`\> |

#### Returns

`void`

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:208](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L208)

___

### \_constructModel

`Private` **_constructModel**(`__namedParameters`): `Promise`<`StateManager`<`Model`<`any`, `any`\>\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ModelConstructionOptions`](../interfaces/dxos_echo_db.ModelConstructionOptions.md) |

#### Returns

`Promise`<`StateManager`<`Model`<`any`, `any`\>\>\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:193](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L193)

___

### constructItem

**constructItem**(`__namedParameters`): `Promise`<[`Item`](dxos_echo_db.Item.md)<`any`\>\>

Constructs an item with the appropriate model.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ItemConstructionOptions`](../interfaces/dxos_echo_db.ItemConstructionOptions.md) |

#### Returns

`Promise`<[`Item`](dxos_echo_db.Item.md)<`any`\>\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:229](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L229)

___

### constructLink

**constructLink**(`__namedParameters`): `Promise`<[`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>\>

Constructs an item with the appropriate model.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`LinkConstructionOptions`](../interfaces/dxos_echo_db.LinkConstructionOptions.md) |

#### Returns

`Promise`<[`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:264](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L264)

___

### createItem

**createItem**(`modelType`, `itemType?`, `parentId?`, `initProps?`): `Promise`<[`Item`](dxos_echo_db.Item.md)<`Model`<`unknown`, `any`\>\>\>

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

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:100](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L100)

___

### createLink

**createLink**(`modelType`, `itemType`, `source`, `target`, `initProps?`): `Promise`<[`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>\>

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

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:148](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L148)

___

### deconstructItem

**deconstructItem**(`itemId`): `void`

Recursive method to unlink and remove items from the active set.

#### Parameters

| Name | Type |
| :------ | :------ |
| `itemId` | `string` |

#### Returns

`void`

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:339](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L339)

___

### getItem

**getItem**<`M`\>(`itemId`): `undefined` \| [`Item`](dxos_echo_db.Item.md)<`M`\>

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

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:323](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L323)

___

### getUninitializedEntities

**getUninitializedEntities**(): [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>[]

#### Returns

[`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>[]

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:331](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L331)

___

### initializeModel

**initializeModel**(`itemId`): `Promise`<`void`\>

Reconstruct an item with a default model when that model becomes registered.
New model instance is created and streams are reconnected.

#### Parameters

| Name | Type |
| :------ | :------ |
| `itemId` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:368](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L368)

___

### processModelMessage

**processModelMessage**(`itemId`, `message`): `Promise`<`void`\>

Process a message directed to a specific model.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `itemId` | `string` | Id of the item containing the model. |
| `message` | `ModelMessage`<`Uint8Array`\> | Encoded model message |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item-manager.ts:311](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L311)
