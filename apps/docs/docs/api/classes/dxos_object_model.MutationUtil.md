---
id: "dxos_object_model.MutationUtil"
title: "Class: MutationUtil"
sidebar_label: "MutationUtil"
custom_edit_url: null
---

[@dxos/object-model](../modules/dxos_object_model.md).MutationUtil

Represents mutations on objects.

## Constructors

### constructor

• **new MutationUtil**()

## Methods

### applyMutation

▸ `Static` **applyMutation**(`object`, `mutation`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | `any` |
| `mutation` | [`ObjectMutation`](../interfaces/dxos_object_model.ObjectMutation-1.md) |

#### Returns

`any`

#### Defined in

[packages/echo/object-model/src/mutation.ts:214](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/mutation.ts#L214)

___

### applyMutationSet

▸ `Static` **applyMutationSet**(`object`, `message`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | `any` |
| `message` | [`ObjectMutationSet`](../interfaces/dxos_object_model.ObjectMutationSet.md) |

#### Returns

`any`

#### Defined in

[packages/echo/object-model/src/mutation.ts:207](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/mutation.ts#L207)

___

### createFieldMutation

▸ `Static` **createFieldMutation**(`key`, `value`): [`ObjectMutation`](../interfaces/dxos_object_model.ObjectMutation-1.md)

Create single field mutation.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `any` |

#### Returns

[`ObjectMutation`](../interfaces/dxos_object_model.ObjectMutation-1.md)

#### Defined in

[packages/echo/object-model/src/mutation.ts:261](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/mutation.ts#L261)

___

### createMultiFieldMutation

▸ `Static` **createMultiFieldMutation**(`object`): [`ObjectMutation`](../interfaces/dxos_object_model.ObjectMutation-1.md)[]

Create field mutations.

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | `any` |

#### Returns

[`ObjectMutation`](../interfaces/dxos_object_model.ObjectMutation-1.md)[]

#### Defined in

[packages/echo/object-model/src/mutation.ts:276](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/mutation.ts#L276)
