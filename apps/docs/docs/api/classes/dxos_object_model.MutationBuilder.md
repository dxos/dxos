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

[packages/echo/object-model/src/object-model.ts:52](https://github.com/dxos/dxos/blob/b06737400/packages/echo/object-model/src/object-model.ts#L52)

## Properties

### \_mutations

• **\_mutations**: `ObjectMutation`[] = `[]`

#### Defined in

[packages/echo/object-model/src/object-model.ts:50](https://github.com/dxos/dxos/blob/b06737400/packages/echo/object-model/src/object-model.ts#L50)

## Methods

### commit

▸ **commit**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/object-model/src/object-model.ts:61](https://github.com/dxos/dxos/blob/b06737400/packages/echo/object-model/src/object-model.ts#L61)

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

[packages/echo/object-model/src/object-model.ts:56](https://github.com/dxos/dxos/blob/b06737400/packages/echo/object-model/src/object-model.ts#L56)
