---
id: "dxos_echo_db.SelectionResult"
title: "Class: SelectionResult<T, R>"
sidebar_label: "SelectionResult"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).SelectionResult

Query subscription.
Represents a live-query (subscription) that can notify about future updates to the relevant subset of items.

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Entity`](dxos_echo_db.Entity.md) |
| `R` | `any` |

## Constructors

### constructor

• **new SelectionResult**<`T`, `R`\>(`_execute`, `_update`, `_root`, `_reducer`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>, `T`\> |
| `R` | `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `_execute` | () => [`SelectionContext`](../modules/dxos_echo_db.md#selectioncontext)<`T`, `R`\> |
| `_update` | `Event`<[`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>[]\> |
| `_root` | [`SelectionRoot`](../modules/dxos_echo_db.md#selectionroot) |
| `_reducer` | `boolean` |

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/result.ts:36](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/selection/result.ts#L36)

## Properties

### \_lastResult

• `Private` **\_lastResult**: [`SelectionContext`](../modules/dxos_echo_db.md#selectioncontext)<`T`, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/result.ts:34](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/selection/result.ts#L34)

___

### update

• `Readonly` **update**: `Event`<[`SelectionResult`](dxos_echo_db.SelectionResult.md)<`T`, `any`\>\>

Fired when there are updates in the selection.
Only update that are relevant to the selection cause the update.

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/result.ts:32](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/selection/result.ts#L32)

## Accessors

### entities

• `get` **entities**(): `T`[]

Get the result of this selection.

#### Returns

`T`[]

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/result.ts:83](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/selection/result.ts#L83)

___

### root

• `get` **root**(): [`SelectionRoot`](../modules/dxos_echo_db.md#selectionroot)

The root of the selection. Either a database or an item. Must be a stable reference.

#### Returns

[`SelectionRoot`](../modules/dxos_echo_db.md#selectionroot)

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/result.ts:76](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/selection/result.ts#L76)

___

### value

• `get` **value**(): `R` extends `void` ? `T`[] : `R`

Returns the selection or reducer result.

#### Returns

`R` extends `void` ? `T`[] : `R`

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/result.ts:95](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/selection/result.ts#L95)

## Methods

### expectOne

▸ **expectOne**(): `T`

Return the first element if the set has exactly one element.

#### Returns

`T`

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/result.ts:107](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/selection/result.ts#L107)

___

### refresh

▸ **refresh**(): [`SelectionResult`](dxos_echo_db.SelectionResult.md)<`T`, `R`\>

Re-run query.

#### Returns

[`SelectionResult`](dxos_echo_db.SelectionResult.md)<`T`, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/result.ts:67](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/selection/result.ts#L67)

___

### toString

▸ **toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/result.ts:57](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/selection/result.ts#L57)
