# Class: Link<M, L, R\>

Link variant of an item. Link two objects together. Can hold a custom model.

## Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model` \| ``null`` = `Model` |
| `L` | extends `Model`<`any`\> = `any` |
| `R` | extends `Model`<`any`\> = `any` |

## Hierarchy

- [`Entity`](Entity.md)<`M`\>

  ↳ **`Link`**

## Table of contents

### Constructors

- [constructor](Link.md#constructor)

### Properties

- [\_itemManager](Link.md#_itemmanager)
- [\_onUpdate](Link.md#_onupdate)

### Accessors

- [id](Link.md#id)
- [isLink](Link.md#islink)
- [model](Link.md#model)
- [modelMeta](Link.md#modelmeta)
- [source](Link.md#source)
- [sourceId](Link.md#sourceid)
- [target](Link.md#target)
- [targetId](Link.md#targetid)
- [type](Link.md#type)

### Methods

- [subscribe](Link.md#subscribe)

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
| `itemManager` | [`ItemManager`](ItemManager.md) |
| `itemId` | `string` |
| `itemType` | `undefined` \| `string` |
| `stateManager` | `StateManager`<`NonNullable`<`M`\>\> |
| `link` | [`LinkData`](../interfaces/LinkData.md) |

#### Overrides

[Entity](Entity.md).[constructor](Entity.md#constructor)

#### Defined in

[packages/echo/echo-db/src/packlets/database/link.ts:32](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/link.ts#L32)

## Properties

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

## Accessors

### id

• `get` **id**(): `string`

#### Returns

`string`

#### Inherited from

Entity.id

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:41](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/entity.ts#L41)

___

### isLink

• `get` **isLink**(): ``true``

#### Returns

``true``

#### Defined in

[packages/echo/echo-db/src/packlets/database/link.ts:48](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/link.ts#L48)

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

### source

• `get` **source**(): [`Item`](Item.md)<`L`\>

#### Returns

[`Item`](Item.md)<`L`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/link.ts:60](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/link.ts#L60)

___

### sourceId

• `get` **sourceId**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/packlets/database/link.ts:52](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/link.ts#L52)

___

### target

• `get` **target**(): [`Item`](Item.md)<`R`\>

#### Returns

[`Item`](Item.md)<`R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/link.ts:65](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/link.ts#L65)

___

### targetId

• `get` **targetId**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/packlets/database/link.ts:56](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/link.ts#L56)

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

### subscribe

▸ **subscribe**(`listener`): () => `void`

Subscribe for updates.

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`entity`: [`Link`](Link.md)<`M`, `L`, `R`\>) => `void` |

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
