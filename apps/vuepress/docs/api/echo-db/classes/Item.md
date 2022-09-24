# Class: Item<M\>

A globally addressable data item.
Items are hermetic data structures contained within a Party. They may be hierarchical.
The Item data structure is governed by a Model class, which implements data consistency.

## Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model` \| ``null`` = `Model` |

## Hierarchy

- [`Entity`](Entity.md)<`M`\>

  ↳ **`Item`**

## Table of contents

### Constructors

- [constructor](Item.md#constructor)

### Properties

- [\_deleted](Item.md#_deleted)
- [\_itemManager](Item.md#_itemmanager)
- [\_onUpdate](Item.md#_onupdate)
- [\_parent](Item.md#_parent)

### Accessors

- [children](Item.md#children)
- [deleted](Item.md#deleted)
- [id](Item.md#id)
- [links](Item.md#links)
- [model](Item.md#model)
- [modelMeta](Item.md#modelmeta)
- [parent](Item.md#parent)
- [readOnly](Item.md#readonly)
- [refs](Item.md#refs)
- [type](Item.md#type)

### Methods

- [\_processMutation](Item.md#_processmutation)
- [\_updateParent](Item.md#_updateparent)
- [delete](Item.md#delete)
- [restore](Item.md#restore)
- [select](Item.md#select)
- [setParent](Item.md#setparent)
- [subscribe](Item.md#subscribe)
- [toString](Item.md#tostring)

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
| `itemManager` | [`ItemManager`](ItemManager.md) |  |
| `itemId` | `string` | Addressable ID. |
| `itemType` | `undefined` \| `string` | User defined type (DXN). |
| `stateManager` | `StateManager`<`NonNullable`<`M`\>\> | Data model (provided by `ModelFactory`). |
| `_writeStream?` | `FeedWriter`<`EchoEnvelope`\> | Write stream (if not read-only). |
| `parent?` | ``null`` \| [`Item`](Item.md)<`any`\> | Parent Item (if not a root Item). |

#### Overrides

[Entity](Entity.md).[constructor](Entity.md#constructor)

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:62](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item.ts#L62)

## Properties

### \_deleted

• `Private` **\_deleted**: `boolean` = `false`

Denotes soft delete.
Item can be restored until garbage collection (e.g., via snapshots).

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:33](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item.ts#L33)

___

### \_itemManager

• `Protected` `Readonly` **\_itemManager**: [`ItemManager`](ItemManager.md)

#### Inherited from

[Entity](Entity.md).[_itemManager](Entity.md#_itemmanager)

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:29](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/entity.ts#L29)

___

### \_onUpdate

• `Protected` `Readonly` **\_onUpdate**: `Event`<[`Entity`](Entity.md)<`any`\>\>

#### Inherited from

[Entity](Entity.md).[_onUpdate](Entity.md#_onupdate)

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:19](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/entity.ts#L19)

___

### \_parent

• `Private` **\_parent**: ``null`` \| [`Item`](Item.md)<`any`\> = `null`

Parent item (or null if this item is a root item).

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:27](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item.ts#L27)

## Accessors

### children

• `get` **children**(): [`Item`](Item.md)<`any`\>[]

#### Returns

[`Item`](Item.md)<`any`\>[]

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:90](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item.ts#L90)

___

### deleted

• `get` **deleted**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:82](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item.ts#L82)

___

### id

• `get` **id**(): `string`

#### Returns

`string`

#### Inherited from

Entity.id

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:41](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/entity.ts#L41)

___

### links

• `get` **links**(): [`Link`](Link.md)<`any`, `any`, `any`\>[]

#### Returns

[`Link`](Link.md)<`any`, `any`, `any`\>[]

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:94](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item.ts#L94)

___

### model

• `get` **model**(): `M`

#### Returns

`M`

#### Inherited from

Entity.model

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:53](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/entity.ts#L53)

___

### modelMeta

• `get` **modelMeta**(): `ModelMeta`<`any`, `any`, `any`\>

#### Returns

`ModelMeta`<`any`, `any`, `any`\>

#### Inherited from

Entity.modelMeta

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:49](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/entity.ts#L49)

___

### parent

• `get` **parent**(): ``null`` \| [`Item`](Item.md)<`any`\>

#### Returns

``null`` \| [`Item`](Item.md)<`any`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:86](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item.ts#L86)

___

### readOnly

• `get` **readOnly**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:78](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item.ts#L78)

___

### refs

• `get` **refs**(): [`Link`](Link.md)<`any`, `any`, `any`\>[]

#### Returns

[`Link`](Link.md)<`any`, `any`, `any`\>[]

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:98](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item.ts#L98)

___

### type

• `get` **type**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Inherited from

Entity.type

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:45](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/entity.ts#L45)

## Methods

### \_processMutation

▸ `Private` **_processMutation**(`mutation`, `getItem`): `void`

Process a mutation from the stream.
 (Package-private).

#### Parameters

| Name | Type |
| :------ | :------ |
| `mutation` | `ItemMutation` |
| `getItem` | (`itemId`: `string`) => `undefined` \| [`Item`](Item.md)<`any`\> |

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:184](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item.ts#L184)

___

### \_updateParent

▸ `Private` **_updateParent**(`parent`): `void`

Atomically update parent/child relationship.

#### Parameters

| Name | Type |
| :------ | :------ |
| `parent` | `undefined` \| ``null`` \| [`Item`](Item.md)<`any`\> |

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:214](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item.ts#L214)

___

### delete

▸ **delete**(): `Promise`<`void`\>

Delete the item.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:117](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item.ts#L117)

___

### restore

▸ **restore**(): `Promise`<`void`\>

Restore deleted item.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:140](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item.ts#L140)

___

### select

▸ **select**(): [`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `void`\>

Returns a selection context, which can be used to traverse the object graph starting from this item.

#### Returns

[`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:105](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item.ts#L105)

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

[packages/echo/echo-db/src/packlets/database/item.ts:161](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item.ts#L161)

___

### subscribe

▸ **subscribe**(`listener`): () => `void`

Subscribe for updates.

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`entity`: [`Item`](Item.md)<`M`\>) => `void` |

#### Returns

`fn`

▸ (): `void`

Register an event listener.

If provided callback was already registered as once-listener, it is made permanent.

##### Returns

`void`

function that unsubscribes this event listener

#### Inherited from

[Entity](Entity.md).[subscribe](Entity.md#subscribe)

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:65](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/entity.ts#L65)

___

### toString

▸ **toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item.ts:74](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item.ts#L74)
