# Class: TestModel

[@dxos/model-factory](../modules/dxos_model_factory.md).TestModel

Abstract base class for Models.
Models define a root message type, which is contained in the parent Item's message envelope.

## Hierarchy

- [`Model`](dxos_model_factory.Model.md)<`Map`<`any`, `any`\>, `TestItemMutation`\>

  ↳ **`TestModel`**

## Constructors

### constructor

**new TestModel**(`_meta`, `_itemId`, `_getState`, `_mutationWriter?`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_meta` | [`ModelMeta`](../types/dxos_model_factory.ModelMeta.md)<`any`, `any`, `any`\> | Metadata definitions. |
| `_itemId` | `string` | Parent item. |
| `_getState` | () => `Map`<`any`, `any`\> | Retrieves the underlying state object. |
| `_mutationWriter?` | [`MutationWriter`](../types/dxos_model_factory.MutationWriter.md)<`TestItemMutation`\> | Output mutation stream (unless read-only). |

#### Inherited from

[Model](dxos_model_factory.Model.md).[constructor](dxos_model_factory.Model.md#constructor)

#### Defined in

[packages/echo/model-factory/src/model.ts:23](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/model.ts#L23)

## Properties

### \_getState

 `Protected` `Readonly` **\_getState**: () => `Map`<`any`, `any`\>

#### Type declaration

(): `Map`<`any`, `any`\>

##### Returns

`Map`<`any`, `any`\>

#### Inherited from

[Model](dxos_model_factory.Model.md).[_getState](dxos_model_factory.Model.md#_getstate)

#### Defined in

[packages/echo/model-factory/src/model.ts:26](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/model.ts#L26)

___

### update

 `Readonly` **update**: `Event`<[`Model`](dxos_model_factory.Model.md)<`Map`<`any`, `any`\>, `TestItemMutation`\>\>

#### Inherited from

[Model](dxos_model_factory.Model.md).[update](dxos_model_factory.Model.md#update)

#### Defined in

[packages/echo/model-factory/src/model.ts:15](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/model.ts#L15)

___

### meta

 `Static` **meta**: [`ModelMeta`](../types/dxos_model_factory.ModelMeta.md)<`any`, `any`, `any`\>

#### Defined in

[packages/echo/model-factory/src/testing/test-model.ts:37](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/testing/test-model.ts#L37)

## Accessors

### itemId

`get` **itemId**(): `string`

#### Returns

`string`

#### Inherited from

Model.itemId

#### Defined in

[packages/echo/model-factory/src/model.ts:45](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/model.ts#L45)

___

### keys

`get` **keys**(): `any`[]

#### Returns

`any`[]

#### Defined in

[packages/echo/model-factory/src/testing/test-model.ts:44](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/testing/test-model.ts#L44)

___

### modelMeta

`get` **modelMeta**(): [`ModelMeta`](../types/dxos_model_factory.ModelMeta.md)<`any`, `any`, `any`\>

#### Returns

[`ModelMeta`](../types/dxos_model_factory.ModelMeta.md)<`any`, `any`, `any`\>

#### Inherited from

Model.modelMeta

#### Defined in

[packages/echo/model-factory/src/model.ts:41](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/model.ts#L41)

___

### properties

`get` **properties**(): `any`

#### Returns

`any`

#### Defined in

[packages/echo/model-factory/src/testing/test-model.ts:48](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/testing/test-model.ts#L48)

___

### readOnly

`get` **readOnly**(): `boolean`

#### Returns

`boolean`

#### Inherited from

Model.readOnly

#### Defined in

[packages/echo/model-factory/src/model.ts:49](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/model.ts#L49)

## Methods

### get

**get**(`key`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`any`

#### Defined in

[packages/echo/model-factory/src/testing/test-model.ts:52](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/testing/test-model.ts#L52)

___

### set

**set**(`key`, `value`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/model-factory/src/testing/test-model.ts:56](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/testing/test-model.ts#L56)

___

### subscribe

**subscribe**(`listener`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`result`: [`TestModel`](dxos_model_factory.TestModel.md)) => `void` |

#### Returns

`fn`

(): `void`

Register an event listener.

If provided callback was already registered as once-listener, it is made permanent.

##### Returns

`void`

function that unsubscribes this event listener

#### Inherited from

[Model](dxos_model_factory.Model.md).[subscribe](dxos_model_factory.Model.md#subscribe)

#### Defined in

[packages/echo/model-factory/src/model.ts:53](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/model.ts#L53)

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

[Model](dxos_model_factory.Model.md).[toJSON](dxos_model_factory.Model.md#tojson)

#### Defined in

[packages/echo/model-factory/src/model.ts:34](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/model.ts#L34)

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Inherited from

[Model](dxos_model_factory.Model.md).[toString](dxos_model_factory.Model.md#tostring)

#### Defined in

[packages/echo/model-factory/src/model.ts:30](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/model.ts#L30)

___

### write

`Protected` **write**(`mutation`): `Promise`<[`MutationWriteReceipt`](../interfaces/dxos_model_factory.MutationWriteReceipt.md)\>

Writes the raw mutation to the output stream.

#### Parameters

| Name | Type |
| :------ | :------ |
| `mutation` | `TestItemMutation` |

#### Returns

`Promise`<[`MutationWriteReceipt`](../interfaces/dxos_model_factory.MutationWriteReceipt.md)\>

#### Inherited from

[Model](dxos_model_factory.Model.md).[write](dxos_model_factory.Model.md#write)

#### Defined in

[packages/echo/model-factory/src/model.ts:60](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/model.ts#L60)
