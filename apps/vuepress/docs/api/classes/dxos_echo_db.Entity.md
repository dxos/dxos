# Class: Entity<M\>

[@dxos/echo-db](../modules/dxos_echo_db.md).Entity

Base class for all ECHO entitities.

Subclassed by Item and Link.

## Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model` \| ``null`` = `Model` |

## Hierarchy

- **`Entity`**

  ↳ [`Item`](dxos_echo_db.Item.md)

  ↳ [`Link`](dxos_echo_db.Link.md)

## Table of contents

### Constructors

- [constructor](dxos_echo_db.Entity.md#constructor)

### Properties

- [\_itemManager](dxos_echo_db.Entity.md#_itemmanager)
- [\_onUpdate](dxos_echo_db.Entity.md#_onupdate)
- [\_subscriptions](dxos_echo_db.Entity.md#_subscriptions)

### Accessors

- [id](dxos_echo_db.Entity.md#id)
- [model](dxos_echo_db.Entity.md#model)
- [modelMeta](dxos_echo_db.Entity.md#modelmeta)
- [type](dxos_echo_db.Entity.md#type)

### Methods

- [subscribe](dxos_echo_db.Entity.md#subscribe)

## Constructors

### constructor

• **new Entity**<`M`\>(`_itemManager`, `_id`, `_type`, `stateManager`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends ``null`` \| `Model`<`any`, `any`\> = `Model`<`any`, `any`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `_itemManager` | [`ItemManager`](dxos_echo_db.ItemManager.md) |
| `_id` | `string` |
| `_type` | `undefined` \| `string` |
| `stateManager` | `StateManager`<`NonNullable`<`M`\>\> |

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:28](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/entity.ts#L28)

## Properties

### \_itemManager

• `Protected` `Readonly` **\_itemManager**: [`ItemManager`](dxos_echo_db.ItemManager.md)

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:29](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/entity.ts#L29)

___

### \_onUpdate

• `Protected` `Readonly` **\_onUpdate**: `Event`<[`Entity`](dxos_echo_db.Entity.md)<`any`\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:19](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/entity.ts#L19)

___

### \_subscriptions

• `Private` `Readonly` **\_subscriptions**: `SubscriptionGroup`

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:21](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/entity.ts#L21)

## Accessors

### id

• `get` **id**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:41](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/entity.ts#L41)

___

### model

• `get` **model**(): `M`

#### Returns

`M`

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:53](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/entity.ts#L53)

___

### modelMeta

• `get` **modelMeta**(): `ModelMeta`<`any`, `any`, `any`\>

#### Returns

`ModelMeta`<`any`, `any`, `any`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:49](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/entity.ts#L49)

___

### type

• `get` **type**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:45](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/entity.ts#L45)

## Methods

### subscribe

▸ **subscribe**(`listener`): () => `void`

Subscribe for updates.

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`entity`: [`Entity`](dxos_echo_db.Entity.md)<`M`\>) => `void` |

#### Returns

`fn`

▸ (): `void`

Register an event listener.

If provided callback was already registered as once-listener, it is made permanent.

##### Returns

`void`

function that unsubscribes this event listener

#### Defined in

[packages/echo/echo-db/src/packlets/database/entity.ts:65](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/entity.ts#L65)
