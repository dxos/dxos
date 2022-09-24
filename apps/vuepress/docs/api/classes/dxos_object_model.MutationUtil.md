# Class: MutationUtil

[@dxos/object-model](../modules/dxos_object_model.md).MutationUtil

Represents mutations on objects.

## Table of contents

### Constructors

- [constructor](dxos_object_model.MutationUtil.md#constructor)

### Methods

- [applyMutation](dxos_object_model.MutationUtil.md#applymutation)
- [applyMutationSet](dxos_object_model.MutationUtil.md#applymutationset)
- [createFieldMutation](dxos_object_model.MutationUtil.md#createfieldmutation)
- [createMultiFieldMutation](dxos_object_model.MutationUtil.md#createmultifieldmutation)

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
| `mutation` | `ObjectMutation` |

#### Returns

`any`

#### Defined in

[packages/echo/object-model/src/mutation.ts:217](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/mutation.ts#L217)

___

### applyMutationSet

▸ `Static` **applyMutationSet**(`object`, `message`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | `any` |
| `message` | `ObjectMutationSet` |

#### Returns

`any`

#### Defined in

[packages/echo/object-model/src/mutation.ts:210](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/mutation.ts#L210)

___

### createFieldMutation

▸ `Static` **createFieldMutation**(`key`, `value`): `ObjectMutation`

Create single field mutation.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `any` |

#### Returns

`ObjectMutation`

#### Defined in

[packages/echo/object-model/src/mutation.ts:264](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/mutation.ts#L264)

___

### createMultiFieldMutation

▸ `Static` **createMultiFieldMutation**(`object`): `ObjectMutation`[]

Create field mutations.

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | `any` |

#### Returns

`ObjectMutation`[]

#### Defined in

[packages/echo/object-model/src/mutation.ts:279](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/mutation.ts#L279)
