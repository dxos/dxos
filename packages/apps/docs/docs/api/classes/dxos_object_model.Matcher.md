# Class: Matcher

[@dxos/object-model](../modules/dxos_object_model.md).Matcher

Predicate matcher.
NOTE: The approach here is to match items against the DNF predicate tree.

## Constructors

### constructor

**new Matcher**(`_options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_options` | `MatcherOptions` |

#### Defined in

[packages/echo/object-model/src/matcher.ts:22](https://github.com/dxos/dxos/blob/main/packages/echo/object-model/src/matcher.ts#L22)

## Methods

### \_matchItem

**_matchItem**(`item`, `predicate`): `boolean`

Recursively match predicate tree against current item.

#### Parameters

| Name | Type |
| :------ | :------ |
| `item` | `any` |
| `predicate` | `Predicate` |

#### Returns

`boolean`

#### Defined in

[packages/echo/object-model/src/matcher.ts:41](https://github.com/dxos/dxos/blob/main/packages/echo/object-model/src/matcher.ts#L41)

___

### getFilter

**getFilter**(`query`): (`item`: `any`) => `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `query` | `Query` |

#### Returns

`fn`

(`item`): `boolean`

##### Parameters

| Name | Type |
| :------ | :------ |
| `item` | `any` |

##### Returns

`boolean`

#### Defined in

[packages/echo/object-model/src/matcher.ts:26](https://github.com/dxos/dxos/blob/main/packages/echo/object-model/src/matcher.ts#L26)

___

### matchItems

**matchItems**(`query`, `items`): `any`[]

Returns list of matched items.

#### Parameters

| Name | Type |
| :------ | :------ |
| `query` | `Query` |
| `items` | `any`[] |

#### Returns

`any`[]

#### Defined in

[packages/echo/object-model/src/matcher.ts:34](https://github.com/dxos/dxos/blob/main/packages/echo/object-model/src/matcher.ts#L34)
