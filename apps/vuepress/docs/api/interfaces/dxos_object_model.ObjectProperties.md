# Interface: ObjectProperties

[@dxos/object-model](../modules/dxos_object_model.md).ObjectProperties

Defines generic object accessor.

## Implemented by

- [`ObjectModel`](../classes/dxos_object_model.ObjectModel.md)

## Table of contents

### Methods

- [get](dxos_object_model.ObjectProperties.md#get)
- [set](dxos_object_model.ObjectProperties.md#set)

## Methods

### get

▸ **get**(`key`, `defaultValue?`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `defaultValue?` | `unknown` |

#### Returns

`any`

#### Defined in

[packages/echo/object-model/src/object-model.ts:70](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/object-model.ts#L70)

___

### set

▸ **set**(`key`, `value`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `unknown` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/object-model/src/object-model.ts:71](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/object-model.ts#L71)
