# Interface: ObjectProperties

[@dxos/object-model](../modules/dxos_object_model.md).ObjectProperties

Defines generic object accessor.

## Implemented by

- [`ObjectModel`](../classes/dxos_object_model.ObjectModel.md)

## Methods

### get

**get**(`key`, `defaultValue?`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `defaultValue?` | `unknown` |

#### Returns

`any`

#### Defined in

[packages/core/echo/object-model/src/object-model.ts:70](https://github.com/dxos/dxos/blob/main/packages/core/echo/object-model/src/object-model.ts#L70)

___

### set

**set**(`key`, `value`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `unknown` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/object-model/src/object-model.ts:71](https://github.com/dxos/dxos/blob/main/packages/core/echo/object-model/src/object-model.ts#L71)
