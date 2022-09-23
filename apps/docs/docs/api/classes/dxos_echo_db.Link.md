---
id: "dxos_echo_db.Link"
title: "Class: Link<M, L, R>"
sidebar_label: "Link"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).Link

Link variant of an item. Link two objects together. Can hold a custom model.

## Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model` \| ``null`` = `Model` |
| `L` | extends `Model`<`any`\> = `any` |
| `R` | extends `Model`<`any`\> = `any` |

## Hierarchy

- [`Entity`](dxos_echo_db.Entity.md)<`M`\>

  ↳ **`Link`**

## Constructors

### constructor

• **new Link**<`M`, `L`, `R`\>(`itemManager`, `itemId`, `itemType`, `stateManager`, `link`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends ``null`` \| `Model`<`any`, `any`\> = `Model`<`any`, `any`\> |
| `L` | extends `Model`<`any`, `any`, `L`\> = `any` |
| `R` | extends `Model`<`any`, `any`, `R`\> = `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `itemManager` | [`ItemManager`](dxos_echo_db.ItemManager.md) |
| `itemId` | `string` |
| `itemType` | `undefined` \| `string` |
| `stateManager` | `StateManager`<`NonNullable`<`M`\>\> |
| `link` | [`LinkData`](../interfaces/dxos_echo_db.LinkData.md) |

#### Overrides

[Entity](dxos_echo_db.Entity.md).[constructor](dxos_echo_db.Entity.md#constructor)

#### Defined in

[packages/echo/echo-db/src/packlets/database/link.ts:32](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/link.ts#L32)

## Properties

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

## Accessors

### id

• `get` **id**(): `string`

#### Returns

`string`

#### Inherited from

Entity.id

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:41](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/entity.ts#L41)

___

### isLink

• `get` **isLink**(): ``true``

#### Returns

``true``

#### Defined in

[packages/echo/echo-db/src/packlets/database/link.ts:48](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/link.ts#L48)

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

### source

• `get` **source**(): [`Item`](dxos_echo_db.Item.md)<`L`\>

#### Returns

[`Item`](dxos_echo_db.Item.md)<`L`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/link.ts:60](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/link.ts#L60)

___

### sourceId

• `get` **sourceId**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/packlets/database/link.ts:52](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/link.ts#L52)

___

### target

• `get` **target**(): [`Item`](dxos_echo_db.Item.md)<`R`\>

#### Returns

[`Item`](dxos_echo_db.Item.md)<`R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/link.ts:65](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/link.ts#L65)

___

### targetId

• `get` **targetId**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/packlets/database/link.ts:56](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/link.ts#L56)

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

### subscribe

▸ **subscribe**(`listener`): () => `void`

Subscribe for updates.

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`entity`: [`Link`](dxos_echo_db.Link.md)<`M`, `L`, `R`\>) => `void` |

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
