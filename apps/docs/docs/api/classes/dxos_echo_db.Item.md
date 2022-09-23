---
id: "dxos_echo_db.Item"
title: "Class: Item<M>"
sidebar_label: "Item"
custom_edit_url: null
---

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

• **new Item**<`M`\>(`itemManager`, `itemId`, `itemType`, `stateManager`, `_writeStream?`, `parent?`)

Items are constructed by the `Database` object.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends ``null`` \| `Model`<`any`, `any`\> = `Model`<`any`, `any`\> |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `itemManager` | [`ItemManager`](dxos_echo_db.ItemManager.md) |  |
| `itemId` | `string` | Addressable ID. |
| `itemType` | `undefined` \| `string` | User defined type (DXN). |
| `stateManager` | `StateManager`<`NonNullable`<`M`\>\> | Data model (provided by `ModelFactory`). |
| `_writeStream?` | `FeedWriter`<`EchoEnvelope`\> | Write stream (if not read-only). |
| `parent?` | ``null`` \| [`Item`](dxos_echo_db.Item.md)<`any`\> | Parent Item (if not a root Item). |

#### Overrides

[Entity](dxos_echo_db.Entity.md).[constructor](dxos_echo_db.Entity.md#constructor)

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:61](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item.ts#L61)

## Properties

### \_deleted

• `Private` **\_deleted**: `boolean` = `false`

Denotes soft delete.
Item can be restored until garbage collection (e.g., via snapshots).

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:32](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item.ts#L32)

___

### \_itemManager

• `Protected` `Readonly` **\_itemManager**: [`ItemManager`](dxos_echo_db.ItemManager.md)

#### Inherited from

[Entity](dxos_echo_db.Entity.md).[_itemManager](dxos_echo_db.Entity.md#_itemmanager)

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:29](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/entity.ts#L29)

___

### \_onUpdate

• `Protected` `Readonly` **\_onUpdate**: `Event`<[`Entity`](dxos_echo_db.Entity.md)<`any`\>\>

#### Inherited from

[Entity](dxos_echo_db.Entity.md).[_onUpdate](dxos_echo_db.Entity.md#_onupdate)

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:19](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/entity.ts#L19)

___

### \_parent

• `Private` **\_parent**: ``null`` \| [`Item`](dxos_echo_db.Item.md)<`any`\> = `null`

Parent item (or null if this item is a root item).

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:26](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item.ts#L26)

## Accessors

### children

• `get` **children**(): [`Item`](dxos_echo_db.Item.md)<`any`\>[]

#### Returns

[`Item`](dxos_echo_db.Item.md)<`any`\>[]

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:89](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item.ts#L89)

___

### deleted

• `get` **deleted**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:81](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item.ts#L81)

___

### id

• `get` **id**(): `string`

#### Returns

`string`

#### Inherited from

Entity.id

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:41](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/entity.ts#L41)

___

### links

• `get` **links**(): [`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>[]

#### Returns

[`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>[]

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:93](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item.ts#L93)

___

### model

• `get` **model**(): `M`

#### Returns

`M`

#### Inherited from

Entity.model

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:53](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/entity.ts#L53)

___

### modelMeta

• `get` **modelMeta**(): `ModelMeta`<`any`, `any`, `any`\>

#### Returns

`ModelMeta`<`any`, `any`, `any`\>

#### Inherited from

Entity.modelMeta

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:49](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/entity.ts#L49)

___

### parent

• `get` **parent**(): ``null`` \| [`Item`](dxos_echo_db.Item.md)<`any`\>

#### Returns

``null`` \| [`Item`](dxos_echo_db.Item.md)<`any`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:85](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item.ts#L85)

___

### readOnly

• `get` **readOnly**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:77](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item.ts#L77)

___

### refs

• `get` **refs**(): [`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>[]

#### Returns

[`Link`](dxos_echo_db.Link.md)<`any`, `any`, `any`\>[]

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:97](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item.ts#L97)

___

### type

• `get` **type**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Inherited from

Entity.type

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:45](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/entity.ts#L45)

## Methods

### \_processMutation

▸ `Private` **_processMutation**(`mutation`, `getItem`): `void`

Process a mutation from the stream.
 (Package-private).

#### Parameters

| Name | Type |
| :------ | :------ |
| `mutation` | `ItemMutation` |
| `getItem` | (`itemId`: `string`) => `undefined` \| [`Item`](dxos_echo_db.Item.md)<`any`\> |

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:183](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item.ts#L183)

___

### \_updateParent

▸ `Private` **_updateParent**(`parent`): `void`

Atomically update parent/child relationship.

#### Parameters

| Name | Type |
| :------ | :------ |
| `parent` | `undefined` \| ``null`` \| [`Item`](dxos_echo_db.Item.md)<`any`\> |

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:213](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item.ts#L213)

___

### delete

▸ **delete**(): `Promise`<`void`\>

Delete the item.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:116](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item.ts#L116)

___

### restore

▸ **restore**(): `Promise`<`void`\>

Restore deleted item.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:139](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item.ts#L139)

___

### select

▸ **select**(): [`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `void`\>

Returns a selection context, which can be used to traverse the object graph starting from this item.

#### Returns

[`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:104](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item.ts#L104)

___

### setParent

▸ **setParent**(`parentId`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `parentId` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:160](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item.ts#L160)

___

### subscribe

▸ **subscribe**(`listener`): () => `void`

Subscribe for updates.

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`entity`: [`Item`](dxos_echo_db.Item.md)<`M`\>) => `void` |

#### Returns

`fn`

▸ (): `void`

Register an event listener.

If provided callback was already registered as once-listener, it is made permanent.

##### Returns

`void`

function that unsubscribes this event listener

#### Inherited from

[Entity](dxos_echo_db.Entity.md).[subscribe](dxos_echo_db.Entity.md#subscribe)

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:65](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/entity.ts#L65)

___

### toString

▸ **toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:73](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item.ts#L73)
