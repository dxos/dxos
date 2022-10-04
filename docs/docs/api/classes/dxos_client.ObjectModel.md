# Class: ObjectModel

[@dxos/client](../modules/dxos_client.md).ObjectModel

Object mutation model.

## Hierarchy

- `Model`<`ObjectModelState`, `ObjectMutationSet`\>

  ↳ **`ObjectModel`**

## Implements

- `ObjectProperties`

## Constructors

### constructor

**new ObjectModel**(`_meta`, `_itemId`, `_getState`, `_mutationWriter?`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_meta` | `ModelMeta`<`any`, `any`, `any`\> | Metadata definitions. |
| `_itemId` | `string` | Parent item. |
| `_getState` | () => `ObjectModelState` | Retrieves the underlying state object. |
| `_mutationWriter?` | `MutationWriter`<`ObjectMutationSet`\> | Output mutation stream (unless read-only). |

#### Inherited from

Model<ObjectModelState, ObjectMutationSet\>.constructor

#### Defined in

packages/core/echo/model-factory/dist/src/model.d.ts:20

## Properties

### \_getState

 `Protected` `Readonly` **\_getState**: () => `ObjectModelState`

#### Type declaration

(): `ObjectModelState`

##### Returns

`ObjectModelState`

#### Inherited from

Model.\_getState

#### Defined in

packages/core/echo/model-factory/dist/src/model.d.ts:11

___

### update

 `Readonly` **update**: `Event`<`Model`<`ObjectModelState`, `ObjectMutationSet`\>\>

#### Inherited from

Model.update

#### Defined in

packages/core/echo/model-factory/dist/src/model.d.ts:13

___

### meta

 `Static` **meta**: `ModelMeta`<`any`, `any`, `any`\>

#### Defined in

packages/core/echo/object-model/dist/src/object-model.d.ts:25

## Accessors

### itemId

`get` **itemId**(): `string`

#### Returns

`string`

#### Inherited from

Model.itemId

#### Defined in

packages/core/echo/model-factory/dist/src/model.d.ts:27

___

### modelMeta

`get` **modelMeta**(): `ModelMeta`<`any`, `any`, `any`\>

#### Returns

`ModelMeta`<`any`, `any`, `any`\>

#### Inherited from

Model.modelMeta

#### Defined in

packages/core/echo/model-factory/dist/src/model.d.ts:26

___

### readOnly

`get` **readOnly**(): `boolean`

#### Returns

`boolean`

#### Inherited from

Model.readOnly

#### Defined in

packages/core/echo/model-factory/dist/src/model.d.ts:28

## Methods

### addToSet

**addToSet**(`key`, `value`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

packages/core/echo/object-model/dist/src/object-model.d.ts:45

___

### builder

**builder**(): `MutationBuilder`

#### Returns

`MutationBuilder`

#### Defined in

packages/core/echo/object-model/dist/src/object-model.d.ts:30

___

### get

**get**(`key`, `defaultValue?`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `defaultValue?` | `unknown` |

#### Returns

`any`

#### Implementation of

ObjectProperties.get

#### Defined in

packages/core/echo/object-model/dist/src/object-model.d.ts:31

___

### getProperty

**getProperty**(`key`, `defaultValue?`): `any`

**`Deprecated`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `defaultValue?` | `any` |

#### Returns

`any`

#### Defined in

packages/core/echo/object-model/dist/src/object-model.d.ts:36

___

### pushToArray

**pushToArray**(`key`, `value`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

packages/core/echo/object-model/dist/src/object-model.d.ts:47

___

### removeFromSet

**removeFromSet**(`key`, `value`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

packages/core/echo/object-model/dist/src/object-model.d.ts:46

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

#### Implementation of

ObjectProperties.set

#### Defined in

packages/core/echo/object-model/dist/src/object-model.d.ts:32

___

### setProperties

**setProperties**(`properties`): `Promise`<`void`\>

**`Deprecated`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `properties` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

packages/core/echo/object-model/dist/src/object-model.d.ts:44

___

### setProperty

**setProperty**(`key`, `value`): `Promise`<`void`\>

**`Deprecated`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

packages/core/echo/object-model/dist/src/object-model.d.ts:40

___

### subscribe

**subscribe**(`listener`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`result`: [`ObjectModel`](dxos_client.ObjectModel.md)) => `void` |

#### Returns

`fn`

(): `void`

##### Returns

`void`

#### Inherited from

Model.subscribe

#### Defined in

packages/core/echo/model-factory/dist/src/model.d.ts:29

___

### toJSON

**toJSON**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `type` | `string` |

#### Inherited from

Model.toJSON

#### Defined in

packages/core/echo/model-factory/dist/src/model.d.ts:22

___

### toObject

**toObject**(): `ObjectModelState`

Returns an immutable object.

#### Returns

`ObjectModelState`

#### Defined in

packages/core/echo/object-model/dist/src/object-model.d.ts:29

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Inherited from

Model.toString

#### Defined in

packages/core/echo/model-factory/dist/src/model.d.ts:21

___

### write

`Protected` **write**(`mutation`): `Promise`<`MutationWriteReceipt`\>

Writes the raw mutation to the output stream.

#### Parameters

| Name | Type |
| :------ | :------ |
| `mutation` | `ObjectMutationSet` |

#### Returns

`Promise`<`MutationWriteReceipt`\>

#### Inherited from

Model.write

#### Defined in

packages/core/echo/model-factory/dist/src/model.d.ts:33
