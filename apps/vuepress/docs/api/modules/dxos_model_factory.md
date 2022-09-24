# Module: @dxos/model-factory

## Table of contents

### Classes

- [Model](../classes/dxos_model_factory.Model.md)
- [ModelFactory](../classes/dxos_model_factory.ModelFactory.md)
- [StateManager](../classes/dxos_model_factory.StateManager.md)
- [TestListModel](../classes/dxos_model_factory.TestListModel.md)
- [TestModel](../classes/dxos_model_factory.TestModel.md)
- [TestPeer](../classes/dxos_model_factory.TestPeer.md)
- [TestRig](../classes/dxos_model_factory.TestRig.md)

### Interfaces

- [MutationProcessMeta](../interfaces/dxos_model_factory.MutationProcessMeta.md)
- [MutationWriteReceipt](../interfaces/dxos_model_factory.MutationWriteReceipt.md)
- [StateMachine](../interfaces/dxos_model_factory.StateMachine.md)

### Type Aliases

- [ModelConstructor](dxos_model_factory.md#modelconstructor)
- [ModelMessage](dxos_model_factory.md#modelmessage)
- [ModelMeta](dxos_model_factory.md#modelmeta)
- [ModelType](dxos_model_factory.md#modeltype)
- [MutationOf](dxos_model_factory.md#mutationof)
- [MutationWriter](dxos_model_factory.md#mutationwriter)
- [StateOf](dxos_model_factory.md#stateof)

### Functions

- [createSetPropertyMutation](dxos_model_factory.md#createsetpropertymutation)
- [validateModelClass](dxos_model_factory.md#validatemodelclass)

## Type Aliases

### ModelConstructor

Ƭ **ModelConstructor**<`M`\>: (`meta`: [`ModelMeta`](dxos_model_factory.md#modelmeta), `itemId`: `ItemID`, `getState`: () => [`StateOf`](dxos_model_factory.md#stateof)<`M`\>, `MutationWriter?`: [`MutationWriter`](dxos_model_factory.md#mutationwriter)<[`MutationOf`](dxos_model_factory.md#mutationof)<`M`\>\>) => `M` & { `meta`: [`ModelMeta`](dxos_model_factory.md#modelmeta)  }

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends [`Model`](../classes/dxos_model_factory.Model.md) |

#### Defined in

[packages/echo/model-factory/src/types.ts:85](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/model-factory/src/types.ts#L85)

___

### ModelMessage

Ƭ **ModelMessage**<`T`\>: `Object`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `meta` | `MutationMetaWithTimeframe` |
| `mutation` | `T` |

#### Defined in

[packages/echo/model-factory/src/types.ts:25](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/model-factory/src/types.ts#L25)

___

### ModelMeta

Ƭ **ModelMeta**<`TState`, `TMutation`, `TSnasphot`\>: `Object`

Model configuration.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TState` | `any` |
| `TMutation` | `any` |
| `TSnasphot` | `any` |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `mutationCodec` | `Codec`<`TMutation`\> |
| `snapshotCodec?` | `Codec`<`TSnasphot`\> |
| `stateMachine` | () => [`StateMachine`](../interfaces/dxos_model_factory.StateMachine.md)<`TState`, `TMutation`, `TSnasphot`\> |
| `type` | [`ModelType`](dxos_model_factory.md#modeltype) |
| `getInitMutation?` | (`props`: `any`) => `Promise`<`any`\> |

#### Defined in

[packages/echo/model-factory/src/types.ts:58](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/model-factory/src/types.ts#L58)

___

### ModelType

Ƭ **ModelType**: `string`

#### Defined in

[packages/echo/model-factory/src/types.ts:14](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/model-factory/src/types.ts#L14)

___

### MutationOf

Ƭ **MutationOf**<`M`\>: `M` extends [`Model`](../classes/dxos_model_factory.Model.md)<`any`, infer TMutation\> ? `TMutation` : `any`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends [`Model`](../classes/dxos_model_factory.Model.md) |

#### Defined in

[packages/echo/model-factory/src/types.ts:20](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/model-factory/src/types.ts#L20)

___

### MutationWriter

Ƭ **MutationWriter**<`T`\>: (`mutation`: `T`) => `Promise`<[`MutationWriteReceipt`](../interfaces/dxos_model_factory.MutationWriteReceipt.md)\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Type declaration

▸ (`mutation`): `Promise`<[`MutationWriteReceipt`](../interfaces/dxos_model_factory.MutationWriteReceipt.md)\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `mutation` | `T` |

##### Returns

`Promise`<[`MutationWriteReceipt`](../interfaces/dxos_model_factory.MutationWriteReceipt.md)\>

#### Defined in

[packages/echo/model-factory/src/types.ts:34](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/model-factory/src/types.ts#L34)

___

### StateOf

Ƭ **StateOf**<`M`\>: `M` extends [`Model`](../classes/dxos_model_factory.Model.md)<infer TState, `any`\> ? `TState` : `any`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends [`Model`](../classes/dxos_model_factory.Model.md) |

#### Defined in

[packages/echo/model-factory/src/types.ts:17](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/model-factory/src/types.ts#L17)

## Functions

### createSetPropertyMutation

▸ **createSetPropertyMutation**(`itemId`, `key`, `value`, `timeframe?`): `FeedMessage`

#### Parameters

| Name | Type |
| :------ | :------ |
| `itemId` | `string` |
| `key` | `string` |
| `value` | `string` |
| `timeframe` | `Timeframe` |

#### Returns

`FeedMessage`

#### Defined in

[packages/echo/model-factory/src/testing/messages.ts:9](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/model-factory/src/testing/messages.ts#L9)

___

### validateModelClass

▸ **validateModelClass**(`model`): asserts model is ModelConstructor<any\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `model` | `any` |

#### Returns

asserts model is ModelConstructor<any\>

#### Defined in

[packages/echo/model-factory/src/types.ts:100](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/model-factory/src/types.ts#L100)
