---
id: "dxos_object_model"
title: "Module: @dxos/object-model"
sidebar_label: "@dxos/object-model"
sidebar_position: 0
custom_edit_url: null
---

## Namespaces

- [ObjectMutation](../namespaces/dxos_object_model.ObjectMutation.md)
- [Predicate](../namespaces/dxos_object_model.Predicate.md)

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

- [Array](../interfaces/dxos_object_model.Array.md)
- [KeyValue](../interfaces/dxos_object_model.KeyValue.md)
- [KeyValueObject](../interfaces/dxos_object_model.KeyValueObject.md)
- [ObjectMutation](../interfaces/dxos_object_model.ObjectMutation-1.md)
- [ObjectMutationSet](../interfaces/dxos_object_model.ObjectMutationSet.md)
- [ObjectProperties](../interfaces/dxos_object_model.ObjectProperties.md)
- [ObjectSnapshot](../interfaces/dxos_object_model.ObjectSnapshot.md)
- [Predicate](../interfaces/dxos_object_model.Predicate-1.md)
- [Query](../interfaces/dxos_object_model.Query.md)
- [SERVICES](../interfaces/dxos_object_model.SERVICES.md)
- [TYPES](../interfaces/dxos_object_model.TYPES.md)
- [Value](../interfaces/dxos_object_model.Value.md)

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

[packages/echo/object-model/src/matcher.ts:9](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/matcher.ts#L9)

___

### ObjectModelState

Ƭ **ObjectModelState**: `Record`<`string`, `any`\>

#### Defined in

[packages/echo/object-model/src/object-model.ts:15](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/object-model.ts#L15)

## Variables

### schema

• `Const` **schema**: `Schema`<[`TYPES`](../interfaces/dxos_object_model.TYPES.md), [`SERVICES`](../interfaces/dxos_object_model.SERVICES.md)\>

#### Defined in

packages/echo/object-model/src/proto/gen/index.ts:19

___

### schemaJson

• `Const` **schemaJson**: `any`

#### Defined in

packages/echo/object-model/src/proto/gen/index.ts:18

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

[packages/echo/object-model/src/util.ts:21](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/util.ts#L21)

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

[packages/echo/object-model/src/util.ts:8](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/util.ts#L8)
