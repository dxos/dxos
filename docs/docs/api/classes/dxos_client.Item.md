# Class: Item<M\>

[@dxos/client](../modules/dxos_client.md).Item

A globally addressable data item.
Items are hermetic data structures contained within a Party. They may be hierarchical.
The Item data structure is governed by a Model class, which implements data consistency.

## Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model` \| ``null`` = `Model` |

## Hierarchy

- [`Entity`](dxos_client.Entity.md)<`M`\>

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
| `itemManager` | `ItemManager` |  |
| `item_id` | `string` | Addressable ID. |
| `item_type` | `undefined` \| `string` | User defined type (DXN). |
| `stateManager` | `StateManager`<`NonNullable`<`M`\>\> | Data model (provided by `ModelFactory`). |
| `_writeStream?` | `FeedWriter`<`EchoEnvelope`\> | Write stream (if not read-only). |
| `parent?` | ``null`` \| [`Item`](dxos_client.Item.md)<`any`\> | Parent Item (if not a root Item). |

#### Overrides

[Entity](dxos_client.Entity.md).[constructor](dxos_client.Entity.md#constructor)

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:34

## Properties

### \_deleted

 `Private` **\_deleted**: `any`

Denotes soft delete.
Item can be restored until garbage collection (e.g., via snapshots).

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:24

___

### \_itemManager

 `Protected` `Readonly` **\_itemManager**: `ItemManager`

#### Inherited from

[Entity](dxos_client.Entity.md).[_itemManager](dxos_client.Entity.md#_itemmanager)

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/entity.d.ts:11

___

### \_onUpdate

 `Protected` `Readonly` **\_onUpdate**: `Event`<[`Entity`](dxos_client.Entity.md)<`any`\>\>

#### Inherited from

[Entity](dxos_client.Entity.md).[_onUpdate](dxos_client.Entity.md#_onupdate)

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/entity.d.ts:14

___

### \_parent

 `Private` **\_parent**: `any`

Parent item (or null if this item is a root item).

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:19

___

### \_updateParent

 `Private` **\_updateParent**: `any`

Atomically update parent/child relationship.

**`Param`**

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:65

___

### \_writeStream

 `Private` `Optional` `Readonly` **\_writeStream**: `any`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:15

## Accessors

### children

`get` **children**(): [`Item`](dxos_client.Item.md)<`any`\>[]

#### Returns

[`Item`](dxos_client.Item.md)<`any`\>[]

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:40

___

### deleted

`get` **deleted**(): `boolean`

#### Returns

`boolean`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:38

___

### id

`get` **id**(): `string`

#### Returns

`string`

#### Inherited from

Entity.id

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/entity.d.ts:17

___

### links

`get` **links**(): [`Link`](dxos_client.Link.md)<`any`, `any`, `any`\>[]

#### Returns

[`Link`](dxos_client.Link.md)<`any`, `any`, `any`\>[]

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:41

___

### model

`get` **model**(): `M`

#### Returns

`M`

#### Inherited from

Entity.model

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/entity.d.ts:20

___

### modelMeta

`get` **modelMeta**(): `ModelMeta`<`any`, `any`, `any`\>

#### Returns

`ModelMeta`<`any`, `any`, `any`\>

#### Inherited from

Entity.modelMeta

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/entity.d.ts:19

___

### parent

`get` **parent**(): ``null`` \| [`Item`](dxos_client.Item.md)<`any`\>

#### Returns

``null`` \| [`Item`](dxos_client.Item.md)<`any`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:39

___

### readOnly

`get` **readOnly**(): `boolean`

#### Returns

`boolean`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:37

___

### refs

`get` **refs**(): [`Link`](dxos_client.Link.md)<`any`, `any`, `any`\>[]

#### Returns

[`Link`](dxos_client.Link.md)<`any`, `any`, `any`\>[]

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:42

___

### type

`get` **type**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Inherited from

Entity.type

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/entity.d.ts:18

## Methods

### \_processMutation

`Private` **_processMutation**(`mutation`, `getItem`): `void`

Process a mutation from the stream.
 (Package-private).

#### Parameters

| Name | Type |
| :------ | :------ |
| `mutation` | `ItemMutation` |
| `getItem` | (`item_id`: `string`) => `undefined` \| [`Item`](dxos_client.Item.md)<`any`\> |

#### Returns

`void`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:60

___

### delete

**delete**(): `Promise`<`void`\>

Delete the item.

#### Returns

`Promise`<`void`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:50

___

### restore

**restore**(): `Promise`<`void`\>

Restore deleted item.

#### Returns

`Promise`<`void`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:54

___

### select

**select**(): [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `void`\>

Returns a selection context, which can be used to traverse the object graph starting from this item.

#### Returns

[`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `void`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:46

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

packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:55

___

### subscribe

**subscribe**(`listener`): () => `void`

Subscribe for updates.

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`entity`: [`Item`](dxos_client.Item.md)<`M`\>) => `void` |

#### Returns

`fn`

(): `void`

Subscribe for updates.

##### Returns

`void`

#### Inherited from

[Entity](dxos_client.Entity.md).[subscribe](dxos_client.Entity.md#subscribe)

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/entity.d.ts:25

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:36
