# Class: SelectionResult<T, R\>

[@dxos/client](../modules/dxos_client.md).SelectionResult

Query subscription.
Represents a live-query (subscription) that can notify about future updates to the relevant subset of items.

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Entity`](dxos_client.Entity.md) |
| `R` | `any` |

## Constructors

### constructor

**new SelectionResult**<`T`, `R`\>(`_execute`, `_update`, `_root`, `_reducer`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Entity`](dxos_client.Entity.md)<`Model`<`any`, `any`\>, `T`\> |
| `R` | `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `_execute` | () => `SelectionContext`<`T`, `R`\> |
| `_update` | `Event`<[`Entity`](dxos_client.Entity.md)<`Model`<`any`, `any`\>\>[]\> |
| `_root` | `SelectionRoot` |
| `_reducer` | `boolean` |

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/selection/result.d.ts:27

## Properties

### \_execute

 `Private` `Readonly` **\_execute**: `any`

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/selection/result.d.ts:17

___

### \_lastResult

 `Private` **\_lastResult**: `any`

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/selection/result.d.ts:26

___

### \_reducer

 `Private` `Readonly` **\_reducer**: `any`

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/selection/result.d.ts:20

___

### \_root

 `Private` `Readonly` **\_root**: `any`

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/selection/result.d.ts:19

___

### \_update

 `Private` `Readonly` **\_update**: `any`

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/selection/result.d.ts:18

___

### update

 `Readonly` **update**: `Event`<[`SelectionResult`](dxos_client.SelectionResult.md)<`T`, `any`\>\>

Fired when there are updates in the selection.
Only update that are relevant to the selection cause the update.

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/selection/result.d.ts:25

## Accessors

### entities

`get` **entities**(): `T`[]

Get the result of this selection.

#### Returns

`T`[]

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/selection/result.d.ts:40

___

### root

`get` **root**(): `SelectionRoot`

The root of the selection. Either a database or an item. Must be a stable reference.

#### Returns

`SelectionRoot`

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/selection/result.d.ts:36

___

### value

`get` **value**(): `R` extends `void` ? `T`[] : `R`

Returns the selection or reducer result.

#### Returns

`R` extends `void` ? `T`[] : `R`

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/selection/result.d.ts:44

## Methods

### expectOne

**expectOne**(): `T`

Return the first element if the set has exactly one element.

#### Returns

`T`

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/selection/result.d.ts:48

___

### refresh

**refresh**(): [`SelectionResult`](dxos_client.SelectionResult.md)<`T`, `R`\>

Re-run query.

#### Returns

[`SelectionResult`](dxos_client.SelectionResult.md)<`T`, `R`\>

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/selection/result.d.ts:32

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Defined in

packages/echo/echo-db/dist/src/packlets/database/selection/result.d.ts:28
