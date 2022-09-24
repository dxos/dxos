# Class: MutationBuilder

[@dxos/object-model](../modules/dxos_object_model.md).MutationBuilder

Batch mutation builder.

## Table of contents

### Constructors

- [constructor](dxos_object_model.MutationBuilder.md#constructor)

### Properties

- [\_mutations](dxos_object_model.MutationBuilder.md#_mutations)

### Methods

- [commit](dxos_object_model.MutationBuilder.md#commit)
- [set](dxos_object_model.MutationBuilder.md#set)

## Constructors

### constructor

• **new MutationBuilder**(`_model`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_model` | [`ObjectModel`](dxos_object_model.ObjectModel.md) |

#### Defined in

[packages/echo/object-model/src/object-model.ts:52](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/object-model/src/object-model.ts#L52)

## Properties

### \_mutations

• **\_mutations**: `ObjectMutation`[] = `[]`

#### Defined in

[packages/echo/object-model/src/object-model.ts:50](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/object-model/src/object-model.ts#L50)

## Methods

### commit

▸ **commit**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/object-model/src/object-model.ts:61](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/object-model/src/object-model.ts#L61)

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

[packages/echo/object-model/src/object-model.ts:56](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/object-model/src/object-model.ts#L56)
