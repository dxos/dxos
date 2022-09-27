---
id: "dxos_object_model"
title: "Module: @dxos/object-model"
sidebar_label: "@dxos/object-model"
sidebar_position: 0
custom_edit_url: null
---

## Classes

- [KeyValueUtil](../classes/dxos_object_model.KeyValueUtil.md)
- [Matcher](../classes/dxos_object_model.Matcher.md)
- [MutationBuilder](../classes/dxos_object_model.MutationBuilder.md)
- [MutationUtil](../classes/dxos_object_model.MutationUtil.md)
- [ObjectModel](../classes/dxos_object_model.ObjectModel.md)
- [OrderedList](../classes/dxos_object_model.OrderedList.md)
- [TextIndex](../classes/dxos_object_model.TextIndex.md)
- [ValueUtil](../classes/dxos_object_model.ValueUtil.md)

## Interfaces

- [ObjectProperties](../interfaces/dxos_object_model.ObjectProperties.md)

## Type Aliases

### Getter

Ƭ **Getter**: (`item`: `any`, `path`: `string`) => `any`

#### Type declaration

▸ (`item`, `path`): `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `item` | `any` |
| `path` | `string` |

##### Returns

`any`

#### Defined in

[packages/echo/object-model/src/matcher.ts:10](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/object-model/src/matcher.ts#L10)

___

### ObjectModelState

Ƭ **ObjectModelState**: `Record`<`string`, `any`\>

#### Defined in

[packages/echo/object-model/src/object-model.ts:16](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/object-model/src/object-model.ts#L16)

## Functions

### removeKey

▸ **removeKey**(`object`, `key`): `any`

Removes the potentially nested property.

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | `any` |
| `key` | `string` |

#### Returns

`any`

#### Defined in

[packages/echo/object-model/src/util.ts:21](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/object-model/src/util.ts#L21)

___

### validateKey

▸ **validateKey**(`key`): `string`

Keys must be valid object keys or dot s

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`string`

#### Defined in

[packages/echo/object-model/src/util.ts:8](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/object-model/src/util.ts#L8)
