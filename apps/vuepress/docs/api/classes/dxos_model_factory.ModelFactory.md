# Class: ModelFactory

[@dxos/model-factory](../modules/dxos_model_factory.md).ModelFactory

Creates Model instances from a registered collection of Model types.

## Table of contents

### Constructors

- [constructor](dxos_model_factory.ModelFactory.md#constructor)

### Properties

- [\_models](dxos_model_factory.ModelFactory.md#_models)
- [registered](dxos_model_factory.ModelFactory.md#registered)

### Methods

- [createModel](dxos_model_factory.ModelFactory.md#createmodel)
- [getModel](dxos_model_factory.ModelFactory.md#getmodel)
- [getModelMeta](dxos_model_factory.ModelFactory.md#getmodelmeta)
- [getModels](dxos_model_factory.ModelFactory.md#getmodels)
- [hasModel](dxos_model_factory.ModelFactory.md#hasmodel)
- [registerModel](dxos_model_factory.ModelFactory.md#registermodel)

## Constructors

### constructor

• **new ModelFactory**()

## Properties

### \_models

• `Private` **\_models**: `Map`<`string`, { `constructor`: [`ModelConstructor`](../modules/dxos_model_factory.md#modelconstructor)<`any`\> ; `meta`: [`ModelMeta`](../modules/dxos_model_factory.md#modelmeta)<`any`, `any`, `any`\>  }\>

#### Defined in

[packages/echo/model-factory/src/model-factory.ts:22](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/model-factory/src/model-factory.ts#L22)

___

### registered

• `Readonly` **registered**: `Event`<[`ModelConstructor`](../modules/dxos_model_factory.md#modelconstructor)<`any`\>\>

#### Defined in

[packages/echo/model-factory/src/model-factory.ts:20](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/model-factory/src/model-factory.ts#L20)

## Methods

### createModel

▸ **createModel**<`M`\>(`modelType`, `itemId`, `snapshot`, `memberKey`, `writeStream?`): [`StateManager`](dxos_model_factory.StateManager.md)<`M`\>

Instantiates new StateManager with the underlying model.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends [`Model`](dxos_model_factory.Model.md)<`any`, `any`, `M`\> |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `modelType` | `string` | Model type DXN. |
| `itemId` | `string` | Id of the item holding the model. |
| `snapshot` | `ModelSnapshot` | Snapshot defining the intial state. `{}` can be provided for empty state. |
| `memberKey` | `PublicKey` | IDENTITY key of the member authoring the model's mutations. |
| `writeStream?` | `FeedWriter`<`Uint8Array`\> | Stream for outbound messages. |

#### Returns

[`StateManager`](dxos_model_factory.StateManager.md)<`M`\>

#### Defined in

[packages/echo/model-factory/src/model-factory.ts:64](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/model-factory/src/model-factory.ts#L64)

___

### getModel

▸ **getModel**(`modelType`): `undefined` \| { `constructor`: [`ModelConstructor`](../modules/dxos_model_factory.md#modelconstructor)<`any`\> ; `meta`: [`ModelMeta`](../modules/dxos_model_factory.md#modelmeta)<`any`, `any`, `any`\>  }

#### Parameters

| Name | Type |
| :------ | :------ |
| `modelType` | `string` |

#### Returns

`undefined` \| { `constructor`: [`ModelConstructor`](../modules/dxos_model_factory.md#modelconstructor)<`any`\> ; `meta`: [`ModelMeta`](../modules/dxos_model_factory.md#modelmeta)<`any`, `any`, `any`\>  }

#### Defined in

[packages/echo/model-factory/src/model-factory.ts:32](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/model-factory/src/model-factory.ts#L32)

___

### getModelMeta

▸ **getModelMeta**(`modelType`): [`ModelMeta`](../modules/dxos_model_factory.md#modelmeta)<`any`, `any`, `any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `modelType` | `string` |

#### Returns

[`ModelMeta`](../modules/dxos_model_factory.md#modelmeta)<`any`, `any`, `any`\>

#### Defined in

[packages/echo/model-factory/src/model-factory.ts:38](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/model-factory/src/model-factory.ts#L38)

___

### getModels

▸ **getModels**(): { `constructor`: [`ModelConstructor`](../modules/dxos_model_factory.md#modelconstructor)<`any`\> ; `meta`: [`ModelMeta`](../modules/dxos_model_factory.md#modelmeta)<`any`, `any`, `any`\>  }[]

#### Returns

{ `constructor`: [`ModelConstructor`](../modules/dxos_model_factory.md#modelconstructor)<`any`\> ; `meta`: [`ModelMeta`](../modules/dxos_model_factory.md#modelmeta)<`any`, `any`, `any`\>  }[]

#### Defined in

[packages/echo/model-factory/src/model-factory.ts:28](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/model-factory/src/model-factory.ts#L28)

___

### hasModel

▸ **hasModel**(`modelType`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `modelType` | `string` |

#### Returns

`boolean`

#### Defined in

[packages/echo/model-factory/src/model-factory.ts:24](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/model-factory/src/model-factory.ts#L24)

___

### registerModel

▸ **registerModel**(`constructor`): [`ModelFactory`](dxos_model_factory.ModelFactory.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `constructor` | [`ModelConstructor`](../modules/dxos_model_factory.md#modelconstructor)<`any`\> |

#### Returns

[`ModelFactory`](dxos_model_factory.ModelFactory.md)

#### Defined in

[packages/echo/model-factory/src/model-factory.ts:48](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/model-factory/src/model-factory.ts#L48)
