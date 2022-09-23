---
id: "dxos_object_model.ValueUtil"
title: "Class: ValueUtil"
sidebar_label: "ValueUtil"
custom_edit_url: null
---

[@dxos/object-model](../modules/dxos_object_model.md).ValueUtil

Represents scalar, array, and hierarchical values.
{ null, boolean, number, string }

## Constructors

### constructor

• **new ValueUtil**()

## Methods

### applyKeyValue

▸ `Static` **applyKeyValue**(`object`, `keyValue`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | `any` |
| `keyValue` | [`KeyValue`](../interfaces/dxos_object_model.KeyValue.md) |

#### Returns

`any`

#### Defined in

[packages/echo/object-model/src/mutation.ts:159](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/mutation.ts#L159)

___

### applyValue

▸ `Static` **applyValue**(`object`, `key`, `value?`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | `any` |
| `key` | `string` |
| `value?` | [`Value`](../interfaces/dxos_object_model.Value.md) |

#### Returns

`any`

#### Defined in

[packages/echo/object-model/src/mutation.ts:164](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/mutation.ts#L164)

___

### bool

▸ `Static` **bool**(`value`): [`Value`](../interfaces/dxos_object_model.Value.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `boolean` |

#### Returns

[`Value`](../interfaces/dxos_object_model.Value.md)

#### Defined in

[packages/echo/object-model/src/mutation.ts:116](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/mutation.ts#L116)

___

### bytes

▸ `Static` **bytes**(`value`): [`Value`](../interfaces/dxos_object_model.Value.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `Uint8Array` |

#### Returns

[`Value`](../interfaces/dxos_object_model.Value.md)

#### Defined in

[packages/echo/object-model/src/mutation.ts:112](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/mutation.ts#L112)

___

### createMessage

▸ `Static` **createMessage**(`value`): [`Value`](../interfaces/dxos_object_model.Value.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `any` |

#### Returns

[`Value`](../interfaces/dxos_object_model.Value.md)

#### Defined in

[packages/echo/object-model/src/mutation.ts:72](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/mutation.ts#L72)

___

### datetime

▸ `Static` **datetime**(`value`): [`Value`](../interfaces/dxos_object_model.Value.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `string` |

#### Returns

[`Value`](../interfaces/dxos_object_model.Value.md)

#### Defined in

[packages/echo/object-model/src/mutation.ts:132](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/mutation.ts#L132)

___

### float

▸ `Static` **float**(`value`): [`Value`](../interfaces/dxos_object_model.Value.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `number` |

#### Returns

[`Value`](../interfaces/dxos_object_model.Value.md)

#### Defined in

[packages/echo/object-model/src/mutation.ts:124](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/mutation.ts#L124)

___

### getObjectValue

▸ `Static` **getObjectValue**(`value`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | [`KeyValueObject`](../interfaces/dxos_object_model.KeyValueObject.md) |

#### Returns

`Object`

#### Defined in

[packages/echo/object-model/src/mutation.ts:145](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/mutation.ts#L145)

___

### getScalarValue

▸ `Static` **getScalarValue**(`value`): `undefined` \| `string` \| `number` \| `boolean` \| `Uint8Array` \| [`KeyValueObject`](../interfaces/dxos_object_model.KeyValueObject.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | [`Value`](../interfaces/dxos_object_model.Value.md) |

#### Returns

`undefined` \| `string` \| `number` \| `boolean` \| `Uint8Array` \| [`KeyValueObject`](../interfaces/dxos_object_model.KeyValueObject.md)

#### Defined in

[packages/echo/object-model/src/mutation.ts:152](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/mutation.ts#L152)

___

### integer

▸ `Static` **integer**(`value`): [`Value`](../interfaces/dxos_object_model.Value.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `number` |

#### Returns

[`Value`](../interfaces/dxos_object_model.Value.md)

#### Defined in

[packages/echo/object-model/src/mutation.ts:120](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/mutation.ts#L120)

___

### object

▸ `Static` **object**(`value`): [`Value`](../interfaces/dxos_object_model.Value.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `Record`<`string`, `any`\> |

#### Returns

[`Value`](../interfaces/dxos_object_model.Value.md)

#### Defined in

[packages/echo/object-model/src/mutation.ts:136](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/mutation.ts#L136)

___

### string

▸ `Static` **string**(`value`): [`Value`](../interfaces/dxos_object_model.Value.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `string` |

#### Returns

[`Value`](../interfaces/dxos_object_model.Value.md)

#### Defined in

[packages/echo/object-model/src/mutation.ts:128](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/mutation.ts#L128)

___

### valueOf

▸ `Static` **valueOf**(`value`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | [`Value`](../interfaces/dxos_object_model.Value.md) |

#### Returns

`any`

#### Defined in

[packages/echo/object-model/src/mutation.ts:91](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/mutation.ts#L91)
