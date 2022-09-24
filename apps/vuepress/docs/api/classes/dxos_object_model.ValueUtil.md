# Class: ValueUtil

[@dxos/object-model](../modules/dxos_object_model.md).ValueUtil

Represents scalar, array, and hierarchical values.
{ null, boolean, number, string }

## Table of contents

### Constructors

- [constructor](dxos_object_model.ValueUtil.md#constructor)

### Methods

- [applyKeyValue](dxos_object_model.ValueUtil.md#applykeyvalue)
- [applyValue](dxos_object_model.ValueUtil.md#applyvalue)
- [bool](dxos_object_model.ValueUtil.md#bool)
- [bytes](dxos_object_model.ValueUtil.md#bytes)
- [createMessage](dxos_object_model.ValueUtil.md#createmessage)
- [datetime](dxos_object_model.ValueUtil.md#datetime)
- [float](dxos_object_model.ValueUtil.md#float)
- [getObjectValue](dxos_object_model.ValueUtil.md#getobjectvalue)
- [getScalarValue](dxos_object_model.ValueUtil.md#getscalarvalue)
- [integer](dxos_object_model.ValueUtil.md#integer)
- [object](dxos_object_model.ValueUtil.md#object)
- [string](dxos_object_model.ValueUtil.md#string)
- [valueOf](dxos_object_model.ValueUtil.md#valueof)

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
| `keyValue` | `KeyValue` |

#### Returns

`any`

#### Defined in

[packages/echo/object-model/src/mutation.ts:162](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/mutation.ts#L162)

___

### applyValue

▸ `Static` **applyValue**(`object`, `key`, `value?`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | `any` |
| `key` | `string` |
| `value?` | `Value` |

#### Returns

`any`

#### Defined in

[packages/echo/object-model/src/mutation.ts:167](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/mutation.ts#L167)

___

### bool

▸ `Static` **bool**(`value`): `Value`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `boolean` |

#### Returns

`Value`

#### Defined in

[packages/echo/object-model/src/mutation.ts:119](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/mutation.ts#L119)

___

### bytes

▸ `Static` **bytes**(`value`): `Value`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `Uint8Array` |

#### Returns

`Value`

#### Defined in

[packages/echo/object-model/src/mutation.ts:115](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/mutation.ts#L115)

___

### createMessage

▸ `Static` **createMessage**(`value`): `Value`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `any` |

#### Returns

`Value`

#### Defined in

[packages/echo/object-model/src/mutation.ts:75](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/mutation.ts#L75)

___

### datetime

▸ `Static` **datetime**(`value`): `Value`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `string` |

#### Returns

`Value`

#### Defined in

[packages/echo/object-model/src/mutation.ts:135](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/mutation.ts#L135)

___

### float

▸ `Static` **float**(`value`): `Value`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `number` |

#### Returns

`Value`

#### Defined in

[packages/echo/object-model/src/mutation.ts:127](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/mutation.ts#L127)

___

### getObjectValue

▸ `Static` **getObjectValue**(`value`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `KeyValueObject` |

#### Returns

`Object`

#### Defined in

[packages/echo/object-model/src/mutation.ts:148](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/mutation.ts#L148)

___

### getScalarValue

▸ `Static` **getScalarValue**(`value`): `undefined` \| `string` \| `number` \| `boolean` \| `Uint8Array` \| `KeyValueObject`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `Value` |

#### Returns

`undefined` \| `string` \| `number` \| `boolean` \| `Uint8Array` \| `KeyValueObject`

#### Defined in

[packages/echo/object-model/src/mutation.ts:155](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/mutation.ts#L155)

___

### integer

▸ `Static` **integer**(`value`): `Value`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `number` |

#### Returns

`Value`

#### Defined in

[packages/echo/object-model/src/mutation.ts:123](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/mutation.ts#L123)

___

### object

▸ `Static` **object**(`value`): `Value`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `Record`<`string`, `any`\> |

#### Returns

`Value`

#### Defined in

[packages/echo/object-model/src/mutation.ts:139](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/mutation.ts#L139)

___

### string

▸ `Static` **string**(`value`): `Value`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `string` |

#### Returns

`Value`

#### Defined in

[packages/echo/object-model/src/mutation.ts:131](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/mutation.ts#L131)

___

### valueOf

▸ `Static` **valueOf**(`value`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `Value` |

#### Returns

`any`

#### Defined in

[packages/echo/object-model/src/mutation.ts:94](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/object-model/src/mutation.ts#L94)
