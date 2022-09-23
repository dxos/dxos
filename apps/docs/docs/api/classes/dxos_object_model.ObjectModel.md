---
id: "dxos_object_model.ObjectModel"
title: "Class: ObjectModel"
sidebar_label: "ObjectModel"
custom_edit_url: null
---

[@dxos/object-model](../modules/dxos_object_model.md).ObjectModel

Object mutation model.

## Hierarchy

- `Model`<[`ObjectModelState`](../modules/dxos_object_model.md#objectmodelstate), [`ObjectMutationSet`](../interfaces/dxos_object_model.ObjectMutationSet.md)\>

  ↳ **`ObjectModel`**

## Implements

- [`ObjectProperties`](../interfaces/dxos_object_model.ObjectProperties.md)

## Constructors

### constructor

• **new ObjectModel**(`_meta`, `_itemId`, `_getState`, `_mutationWriter?`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_meta` | `ModelMeta`<`any`, `any`, `any`\> | Metadata definitions. |
| `_itemId` | `string` | Parent item. |
| `_getState` | () => [`ObjectModelState`](../modules/dxos_object_model.md#objectmodelstate) | Retrieves the underlying state object. |
| `_mutationWriter?` | `MutationWriter`<[`ObjectMutationSet`](../interfaces/dxos_object_model.ObjectMutationSet.md)\> | Output mutation stream (unless read-only). |

#### Inherited from

Model<ObjectModelState, ObjectMutationSet\>.constructor

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:20

## Properties

### \_getState

• `Protected` `Readonly` **\_getState**: () => [`ObjectModelState`](../modules/dxos_object_model.md#objectmodelstate)

#### Type declaration

▸ (): [`ObjectModelState`](../modules/dxos_object_model.md#objectmodelstate)

##### Returns

[`ObjectModelState`](../modules/dxos_object_model.md#objectmodelstate)

#### Inherited from

Model.\_getState

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:11

___

### update

• `Readonly` **update**: `Event`<`Model`<[`ObjectModelState`](../modules/dxos_object_model.md#objectmodelstate), [`ObjectMutationSet`](../interfaces/dxos_object_model.ObjectMutationSet.md)\>\>

#### Inherited from

Model.update

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:13

___

### meta

▪ `Static` **meta**: `ModelMeta`<`any`, `any`, `any`\>

#### Defined in

[packages/echo/object-model/src/object-model.ts:78](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/object-model.ts#L78)

## Accessors

### itemId

• `get` **itemId**(): `string`

#### Returns

`string`

#### Inherited from

Model.itemId

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:27

___

### modelMeta

• `get` **modelMeta**(): `ModelMeta`<`any`, `any`, `any`\>

#### Returns

`ModelMeta`<`any`, `any`, `any`\>

#### Inherited from

Model.modelMeta

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:26

___

### readOnly

• `get` **readOnly**(): `boolean`

#### Returns

`boolean`

#### Inherited from

Model.readOnly

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:28

## Methods

### addToSet

▸ **addToSet**(`key`, `value`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/object-model/src/object-model.ts:144](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/object-model.ts#L144)

___

### builder

▸ **builder**(): [`MutationBuilder`](dxos_object_model.MutationBuilder.md)

#### Returns

[`MutationBuilder`](dxos_object_model.MutationBuilder.md)

#### Defined in

[packages/echo/object-model/src/object-model.ts:100](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/object-model.ts#L100)

___

### get

▸ **get**(`key`, `defaultValue?`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `defaultValue?` | `unknown` |

#### Returns

`any`

#### Implementation of

[ObjectProperties](../interfaces/dxos_object_model.ObjectProperties.md).[get](../interfaces/dxos_object_model.ObjectProperties.md#get)

#### Defined in

[packages/echo/object-model/src/object-model.ts:104](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/object-model.ts#L104)

___

### getProperty

▸ **getProperty**(`key`, `defaultValue?`): `any`

**`Deprecated`**

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `key` | `string` | `undefined` |
| `defaultValue` | `any` | `undefined` |

#### Returns

`any`

#### Defined in

[packages/echo/object-model/src/object-model.ts:122](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/object-model.ts#L122)

___

### pushToArray

▸ **pushToArray**(`key`, `value`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/object-model/src/object-model.ts:168](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/object-model.ts#L168)

___

### removeFromSet

▸ **removeFromSet**(`key`, `value`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/object-model/src/object-model.ts:156](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/object-model.ts#L156)

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

#### Implementation of

[ObjectProperties](../interfaces/dxos_object_model.ObjectProperties.md).[set](../interfaces/dxos_object_model.ObjectProperties.md#set)

#### Defined in

[packages/echo/object-model/src/object-model.ts:109](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/object-model.ts#L109)

___

### setProperties

▸ **setProperties**(`properties`): `Promise`<`void`\>

**`Deprecated`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `properties` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/object-model/src/object-model.ts:138](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/object-model.ts#L138)

___

### setProperty

▸ **setProperty**(`key`, `value`): `Promise`<`void`\>

**`Deprecated`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/object-model/src/object-model.ts:130](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/object-model.ts#L130)

___

### subscribe

▸ **subscribe**(`listener`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`result`: [`ObjectModel`](dxos_object_model.ObjectModel.md)) => `void` |

#### Returns

`fn`

▸ (): `void`

##### Returns

`void`

#### Inherited from

Model.subscribe

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:29

___

### toJSON

▸ **toJSON**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `type` | `string` |

#### Inherited from

Model.toJSON

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:22

___

### toObject

▸ **toObject**(): [`ObjectModelState`](../modules/dxos_object_model.md#objectmodelstate)

Returns an immutable object.

#### Returns

[`ObjectModelState`](../modules/dxos_object_model.md#objectmodelstate)

#### Defined in

[packages/echo/object-model/src/object-model.ts:96](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/object-model/src/object-model.ts#L96)

___

### toString

▸ **toString**(): `string`

#### Returns

`string`

#### Inherited from

Model.toString

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:21

___

### write

▸ `Protected` **write**(`mutation`): `Promise`<`MutationWriteReceipt`\>

Writes the raw mutation to the output stream.

#### Parameters

| Name | Type |
| :------ | :------ |
| `mutation` | [`ObjectMutationSet`](../interfaces/dxos_object_model.ObjectMutationSet.md) |

#### Returns

`Promise`<`MutationWriteReceipt`\>

#### Inherited from

Model.write

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:33
