# Class: Item<M\>

[@dxos/echo-db](../modules/dxos_echo_db.md).Item

A globally addressable data item.
Items are hermetic data structures contained within a Party. They may be hierarchical.
The Item data structure is governed by a Model class, which implements data consistency.

## Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model` \| ``null`` = `Model` |

## Hierarchy

- [`Entity`](dxos_echo_db.Entity.md)<`M`\>

  ↳ **`Item`**

## Constructors

### constructor

**new Item**<`M`\>(`itemManager`, `item_id`, `item_type`, `stateManager`, `_writeStream?`, `parent?`)

Items are constructed by the `Database` object.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends ``null`` \| `Model`<`any`, `any`\> = `Model`<`any`, `any`\> |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `itemManager` | [`ItemManager`](dxos_echo_db.ItemManager.md) |  |
| `item_id` | `string` | Addressable ID. |
| `item_type` | `undefined` \| `string` | User defined type (DXN). |
| `stateManager` | `StateManager`<`NonNullable`<`M`\>\> | Data model (provided by `ModelFactory`). |
| `_writeStream?` | `FeedWriter`<`EchoEnvelope`\> | Write stream (if not read-only). |
| `parent?` | ``null`` \| [`Item`](dxos_echo_db.Item.md)<`any`\> | Parent Item (if not a root Item). |

#### Overrides

[Entity](dxos_echo_db.Entity.md).[constructor](dxos_echo_db.Entity.md#constructor)

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item.ts:63](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item.ts#L63)

## Properties

### \_deleted

 `Private` **\_deleted**: `boolean` = `false`

Denotes soft delete.
Item can be restored until garbage collection (e.g., via snapshots).

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item.ts:34](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item.ts#L34)

___

### \_itemManager

 `Protected` `Readonly` **\_itemManager**: [`ItemManager`](dxos_echo_db.ItemManager.md)

#### Inherited from

[Entity](dxos_echo_db.Entity.md).[_itemManager](dxos_echo_db.Entity.md#_itemmanager)

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/entity.ts:29](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/entity.ts#L29)

___

### \_onUpdate

 `Protected` `Readonly` **\_onUpdate**: `Event`<[`Entity`](dxos_echo_db.Entity.md)<`any`\>\>

#### Inherited from

[Entity](dxos_echo_db.Entity.md).[_onUpdate](dxos_echo_db.Entity.md#_onupdate)

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/entity.ts:19](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/entity.ts#L19)

___

### \_parent

 `Private` **\_parent**: ``null`` \| [`Item`](dxos_echo_db.Item.md)<`any`\> = `null`

Parent item (or null if this item is a root item).

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item.ts:28](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item.ts#L28)

## Accessors

### children

`get` **children**(): [`Item`](dxos_echo_db.Item.md)<`any`\>[]

#### Returns

[`Item`](dxos_echo_db.Item.md)<`any`\>[]

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item.ts:91](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item.ts#L91)

___

### deleted

`get` **deleted**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item.ts:83](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item.ts#L83)

___

### id

`get` **id**(): `string`

#### Returns

`string`

#### Inherited from

Entity.id

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/entity.ts:41](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/entity.ts#L41)

___

### links

`get` **links**(): [`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>[]

#### Returns

[`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>[]

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item.ts:95](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item.ts#L95)

___

### model

`get` **model**(): `M`

#### Returns

`M`

#### Inherited from

Entity.model

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/entity.ts:53](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/entity.ts#L53)

___

### modelMeta

`get` **modelMeta**(): `ModelMeta`<`any`, `any`, `any`\>

#### Returns

`ModelMeta`<`any`, `any`, `any`\>

#### Inherited from

Entity.modelMeta

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/entity.ts:49](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/entity.ts#L49)

___

### parent

`get` **parent**(): ``null`` \| [`Item`](dxos_echo_db.Item.md)<`any`\>

#### Returns

``null`` \| [`Item`](dxos_echo_db.Item.md)<`any`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item.ts:87](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item.ts#L87)

___

### readOnly

`get` **readOnly**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item.ts:79](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item.ts#L79)

___

### refs

`get` **refs**(): [`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>[]

#### Returns

[`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>[]

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item.ts:99](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item.ts#L99)

___

### type

`get` **type**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Inherited from

Entity.type

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/entity.ts:45](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/entity.ts#L45)

## Methods

### \_processMutation

`Private` **_processMutation**(`mutation`, `getItem`): `void`

Process a mutation from the stream.
 (Package-private).

#### Parameters

| Name | Type |
| :------ | :------ |
| `mutation` | `ItemMutation` |
| `getItem` | (`item_id`: `string`) => `undefined` \| [`Item`](dxos_echo_db.Item.md)<`any`\> |

#### Returns

`void`

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item.ts:185](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item.ts#L185)

___

### \_updateParent

`Private` **_updateParent**(`parent`): `void`

Atomically update parent/child relationship.

#### Parameters

| Name | Type |
| :------ | :------ |
| `parent` | `undefined` \| ``null`` \| [`Item`](dxos_echo_db.Item.md)<`any`\> |

#### Returns

`void`

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item.ts:215](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item.ts#L215)

___

### delete

**delete**(): `Promise`<`void`\>

Delete the item.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item.ts:118](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item.ts#L118)

___

### restore

**restore**(): `Promise`<`void`\>

Restore deleted item.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item.ts:141](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item.ts#L141)

___

### select

**select**(): [`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `void`\>

Returns a selection context, which can be used to traverse the object graph starting from this item.

#### Returns

[`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item.ts:106](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item.ts#L106)

___

### setParent

**setParent**(`parent_id`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `parent_id` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item.ts:162](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item.ts#L162)

___

### subscribe

**subscribe**(`listener`): () => `void`

Subscribe for updates.

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`entity`: [`Item`](dxos_echo_db.Item.md)<`M`\>) => `void` |

#### Returns

`fn`

(): `void`

Register an event listener.

If provided callback was already registered as once-listener, it is made permanent.

##### Returns

`void`

function that unsubscribes this event listener

#### Inherited from

[Entity](dxos_echo_db.Entity.md).[subscribe](dxos_echo_db.Entity.md#subscribe)

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/entity.ts:65](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/entity.ts#L65)

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/item.ts:75](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/item.ts#L75)
