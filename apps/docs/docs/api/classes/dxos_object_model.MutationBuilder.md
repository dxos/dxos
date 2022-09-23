---
id: "dxos_object_model.MutationBuilder"
title: "Class: MutationBuilder"
sidebar_label: "MutationBuilder"
custom_edit_url: null
---

[@dxos/object-model](../modules/dxos_object_model.md).MutationBuilder

Batch mutation builder.

## Constructors

### constructor

• **new MutationBuilder**(`_model`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_model` | [`ObjectModel`](dxos_object_model.ObjectModel.md) |

#### Defined in

[packages/echo/object-model/src/object-model.ts:51](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/object-model.ts#L51)

## Properties

### \_mutations

• **\_mutations**: [`ObjectMutation`](../interfaces/dxos_object_model.ObjectMutation-1.md)[] = `[]`

#### Defined in

[packages/echo/object-model/src/object-model.ts:49](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/object-model.ts#L49)

## Methods

### commit

▸ **commit**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/object-model/src/object-model.ts:60](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/object-model.ts#L60)

___

### set

▸ **set**(`key`, `value`): [`MutationBuilder`](dxos_object_model.MutationBuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `any` |

#### Returns

[`MutationBuilder`](dxos_object_model.MutationBuilder.md)

#### Defined in

[packages/echo/object-model/src/object-model.ts:55](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/object-model.ts#L55)
