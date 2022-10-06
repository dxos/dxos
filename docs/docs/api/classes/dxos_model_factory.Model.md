# Class: Model<TState, TMutation\>

[@dxos/model-factory](../modules/dxos_model_factory.md).Model

Abstract base class for Models.
Models define a root message type, which is contained in the parent Item's message envelope.

## Type parameters

| Name | Type |
| :------ | :------ |
| `TState` | `any` |
| `TMutation` | `any` |

## Hierarchy

- **`Model`**

  ↳ [`TestModel`](dxos_model_factory.TestModel.md)

  ↳ [`TestListModel`](dxos_model_factory.TestListModel.md)

## Constructors

### constructor

**new Model**<`TState`, `TMutation`\>(`_meta`, `_itemId`, `_getState`, `_mutationWriter?`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TState` | `any` |
| `TMutation` | `any` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_meta` | [`ModelMeta`](../types/dxos_model_factory.ModelMeta.md)<`any`, `any`, `any`\> | Metadata definitions. |
| `_itemId` | `string` | Parent item. |
| `_getState` | () => `TState` | Retrieves the underlying state object. |
| `_mutationWriter?` | [`MutationWriter`](../types/dxos_model_factory.MutationWriter.md)<`TMutation`\> | Output mutation stream (unless read-only). |

#### Defined in

[packages/core/echo/model-factory/src/model.ts:23](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model.ts#L23)

## Properties

### \_getState

 `Protected` `Readonly` **\_getState**: () => `TState`

#### Type declaration

(): `TState`

##### Returns

`TState`

#### Defined in

[packages/core/echo/model-factory/src/model.ts:26](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model.ts#L26)

___

### update

 `Readonly` **update**: `Event`<[`Model`](dxos_model_factory.Model.md)<`TState`, `TMutation`\>\>

#### Defined in

[packages/core/echo/model-factory/src/model.ts:15](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model.ts#L15)

## Accessors

### item_id

`get` **item_id**(): `string`

#### Returns

`string`

#### Defined in

[packages/core/echo/model-factory/src/model.ts:45](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model.ts#L45)

___

### modelMeta

`get` **modelMeta**(): [`ModelMeta`](../types/dxos_model_factory.ModelMeta.md)<`any`, `any`, `any`\>

#### Returns

[`ModelMeta`](../types/dxos_model_factory.ModelMeta.md)<`any`, `any`, `any`\>

#### Defined in

[packages/core/echo/model-factory/src/model.ts:41](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model.ts#L41)

___

### readOnly

`get` **readOnly**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/core/echo/model-factory/src/model.ts:49](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model.ts#L49)

## Methods

### subscribe

**subscribe**(`listener`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`result`: [`Model`](dxos_model_factory.Model.md)<`TState`, `TMutation`\>) => `void` |

#### Returns

`fn`

(): `void`

Register an event listener.

If provided callback was already registered as once-listener, it is made permanent.

##### Returns

`void`

function that unsubscribes this event listener

#### Defined in

[packages/core/echo/model-factory/src/model.ts:53](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model.ts#L53)

___

### toJSON

**toJSON**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `type` | `string` |

#### Defined in

[packages/core/echo/model-factory/src/model.ts:34](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model.ts#L34)

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/core/echo/model-factory/src/model.ts:30](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model.ts#L30)

___

### write

`Protected` **write**(`mutation`): `Promise`<[`MutationWriteReceipt`](../interfaces/dxos_model_factory.MutationWriteReceipt.md)\>

Writes the raw mutation to the output stream.

#### Parameters

| Name | Type |
| :------ | :------ |
| `mutation` | `TMutation` |

#### Returns

`Promise`<[`MutationWriteReceipt`](../interfaces/dxos_model_factory.MutationWriteReceipt.md)\>

#### Defined in

[packages/core/echo/model-factory/src/model.ts:60](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model.ts#L60)
