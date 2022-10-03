# Class: Entity<M\>

[@dxos/client](../modules/dxos_client.md).Entity

Base class for all ECHO entitities.

Subclassed by Item and Link.

## Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model` \| ``null`` = `Model` |

## Hierarchy

- **`Entity`**

  ↳ [`Item`](dxos_client.Item.md)

  ↳ [`Link`](dxos_client.Link.md)

## Constructors

### constructor

**new Entity**<`M`\>(`_itemManager`, `_id`, `_type`, `stateManager`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends ``null`` \| `Model`<`any`, `any`\> = `Model`<`any`, `any`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `_itemManager` | `ItemManager` |
| `_id` | `string` |
| `_type` | `undefined` \| `string` |
| `stateManager` | `StateManager`<`NonNullable`<`M`\>\> |

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/entity.d.ts:16

## Properties

### \_id

 `Private` `Readonly` **\_id**: `any`

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/entity.d.ts:12

___

### \_itemManager

 `Protected` `Readonly` **\_itemManager**: `ItemManager`

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/entity.d.ts:11

___

### \_onUpdate

 `Protected` `Readonly` **\_onUpdate**: `Event`<[`Entity`](dxos_client.Entity.md)<`any`\>\>

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/entity.d.ts:14

___

### \_subscriptions

 `Private` `Readonly` **\_subscriptions**: `any`

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/entity.d.ts:15

___

### \_type

 `Private` `Readonly` **\_type**: `any`

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/entity.d.ts:13

## Accessors

### id

`get` **id**(): `string`

#### Returns

`string`

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/entity.d.ts:17

___

### model

`get` **model**(): `M`

#### Returns

`M`

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/entity.d.ts:20

___

### modelMeta

`get` **modelMeta**(): `ModelMeta`<`any`, `any`, `any`\>

#### Returns

`ModelMeta`<`any`, `any`, `any`\>

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/entity.d.ts:19

___

### type

`get` **type**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/entity.d.ts:18

## Methods

### subscribe

**subscribe**(`listener`): () => `void`

Subscribe for updates.

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`entity`: [`Entity`](dxos_client.Entity.md)<`M`\>) => `void` |

#### Returns

`fn`

(): `void`

Subscribe for updates.

##### Returns

`void`

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/entity.d.ts:25
