---
id: "dxos_object_model.Matcher"
title: "Class: Matcher"
sidebar_label: "Matcher"
custom_edit_url: null
---

[@dxos/object-model](../modules/dxos_object_model.md).Matcher

Predicate matcher.
NOTE: The approach here is to match items against the DNF predicate tree.

## Constructors

### constructor

• **new Matcher**(`_options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_options` | `MatcherOptions` |

#### Defined in

[packages/echo/object-model/src/matcher.ts:21](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/matcher.ts#L21)

## Methods

### \_matchItem

▸ **_matchItem**(`item`, `predicate`): `boolean`

Recursively match predicate tree against current item.

#### Parameters

| Name | Type |
| :------ | :------ |
| `item` | `any` |
| `predicate` | [`Predicate`](../interfaces/dxos_object_model.Predicate-1.md) |

#### Returns

`boolean`

#### Defined in

[packages/echo/object-model/src/matcher.ts:40](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/matcher.ts#L40)

___

### getFilter

▸ **getFilter**(`query`): (`item`: `any`) => `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `query` | [`Query`](../interfaces/dxos_object_model.Query.md) |

#### Returns

`fn`

▸ (`item`): `boolean`

##### Parameters

| Name | Type |
| :------ | :------ |
| `item` | `any` |

##### Returns

`boolean`

#### Defined in

[packages/echo/object-model/src/matcher.ts:25](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/matcher.ts#L25)

___

### matchItems

▸ **matchItems**(`query`, `items`): `any`[]

Returns list of matched items.

#### Parameters

| Name | Type |
| :------ | :------ |
| `query` | [`Query`](../interfaces/dxos_object_model.Query.md) |
| `items` | `any`[] |

#### Returns

`any`[]

#### Defined in

[packages/echo/object-model/src/matcher.ts:33](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/matcher.ts#L33)
