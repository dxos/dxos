# Class: Link<M, L, R\>

[@dxos/client](../modules/dxos_client.md).Link

Link variant of an item. Link two objects together. Can hold a custom model.

## Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model` \| ``null`` = `Model` |
| `L` | extends `Model`<`any`\> = `any` |
| `R` | extends `Model`<`any`\> = `any` |

## Hierarchy

- [`Entity`](dxos_client.Entity.md)<`M`\>

  ↳ **`Link`**

## Constructors

### constructor

**new Link**<`M`, `L`, `R`\>(`itemManager`, `itemId`, `itemType`, `stateManager`, `link`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends ``null`` \| `Model`<`any`, `any`\> = `Model`<`any`, `any`\> |
| `L` | extends `Model`<`any`, `any`, `L`\> = `any` |
| `R` | extends `Model`<`any`, `any`, `R`\> = `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `itemManager` | `ItemManager` |
| `itemId` | `string` |
| `itemType` | `undefined` \| `string` |
| `stateManager` | `StateManager`<`NonNullable`<`M`\>\> |
| `link` | `LinkData` |

#### Overrides

[Entity](dxos_client.Entity.md).[constructor](dxos_client.Entity.md#constructor)

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/link.d.ts:16

## Properties

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

## Accessors

### id

`get` **id**(): `string`

#### Returns

`string`

#### Inherited from

Entity.id

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/entity.d.ts:17

___

### isLink

`get` **isLink**(): ``true``

#### Returns

``true``

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/link.d.ts:17

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

### source

`get` **source**(): [`Item`](dxos_client.Item.md)<`L`\>

#### Returns

[`Item`](dxos_client.Item.md)<`L`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/link.d.ts:20

___

### sourceId

`get` **sourceId**(): `string`

#### Returns

`string`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/link.d.ts:18

___

### target

`get` **target**(): [`Item`](dxos_client.Item.md)<`R`\>

#### Returns

[`Item`](dxos_client.Item.md)<`R`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/link.d.ts:21

___

### targetId

`get` **targetId**(): `string`

#### Returns

`string`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/link.d.ts:19

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

### subscribe

**subscribe**(`listener`): () => `void`

Subscribe for updates.

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`entity`: [`Link`](dxos_client.Link.md)<`M`, `L`, `R`\>) => `void` |

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
