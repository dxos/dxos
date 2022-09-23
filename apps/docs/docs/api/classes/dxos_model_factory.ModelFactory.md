---
id: "dxos_model_factory.ModelFactory"
title: "Class: ModelFactory"
sidebar_label: "ModelFactory"
custom_edit_url: null
---

[@dxos/model-factory](../modules/dxos_model_factory.md).ModelFactory

Creates Model instances from a registered collection of Model types.

## Constructors

### constructor

• **new ModelFactory**()

## Properties

### \_models

• `Private` **\_models**: `Map`<`string`, { `constructor`: [`ModelConstructor`](../modules/dxos_model_factory.md#modelconstructor)<`any`\> ; `meta`: [`ModelMeta`](../modules/dxos_model_factory.md#modelmeta)<`any`, `any`, `any`\>  }\>

#### Defined in

[packages/echo/model-factory/src/model-factory.ts:21](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/model-factory.ts#L21)

___

### registered

• `Readonly` **registered**: `Event`<[`ModelConstructor`](../modules/dxos_model_factory.md#modelconstructor)<`any`\>\>

#### Defined in

[packages/echo/model-factory/src/model-factory.ts:19](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/model-factory.ts#L19)

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

[packages/echo/model-factory/src/model-factory.ts:63](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/model-factory.ts#L63)

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

[packages/echo/model-factory/src/model-factory.ts:31](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/model-factory.ts#L31)

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

[packages/echo/model-factory/src/model-factory.ts:37](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/model-factory.ts#L37)

___

### getModels

▸ **getModels**(): { `constructor`: [`ModelConstructor`](../modules/dxos_model_factory.md#modelconstructor)<`any`\> ; `meta`: [`ModelMeta`](../modules/dxos_model_factory.md#modelmeta)<`any`, `any`, `any`\>  }[]

#### Returns

{ `constructor`: [`ModelConstructor`](../modules/dxos_model_factory.md#modelconstructor)<`any`\> ; `meta`: [`ModelMeta`](../modules/dxos_model_factory.md#modelmeta)<`any`, `any`, `any`\>  }[]

#### Defined in

[packages/echo/model-factory/src/model-factory.ts:27](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/model-factory.ts#L27)

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

[packages/echo/model-factory/src/model-factory.ts:23](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/model-factory.ts#L23)

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

[packages/echo/model-factory/src/model-factory.ts:47](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/model-factory.ts#L47)
