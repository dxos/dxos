# Class: ModelFactory

[@dxos/model-factory](../modules/dxos_model_factory.md).ModelFactory

Creates Model instances from a registered collection of Model types.

## Constructors

### constructor

**new ModelFactory**()

## Properties

### \_models

 `Private` **\_models**: `Map`<`string`, { `constructor`: [`ModelConstructor`](../types/dxos_model_factory.ModelConstructor.md)<`any`\> ; `meta`: [`ModelMeta`](../types/dxos_model_factory.ModelMeta.md)<`any`, `any`, `any`\>  }\>

#### Defined in

[packages/core/echo/model-factory/src/model-factory.ts:23](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model-factory.ts#L23)

___

### registered

 `Readonly` **registered**: `Event`<[`ModelConstructor`](../types/dxos_model_factory.ModelConstructor.md)<`any`\>\>

#### Defined in

[packages/core/echo/model-factory/src/model-factory.ts:21](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model-factory.ts#L21)

## Methods

### createModel

**createModel**<`M`\>(`model_type`, `item_id`, `snapshot`, `member_key`, `writeStream?`): [`StateManager`](dxos_model_factory.StateManager.md)<`M`\>

Instantiates new StateManager with the underlying model.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends [`Model`](dxos_model_factory.Model.md)<`any`, `any`, `M`\> |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `model_type` | `string` | Model type DXN. |
| `item_id` | `string` | Id of the item holding the model. |
| `snapshot` | `ModelSnapshot` | Snapshot defining the intial state. `{}` can be provided for empty state. |
| `member_key` | `PublicKey` | IDENTITY key of the member authoring the model's mutations. |
| `writeStream?` | `FeedWriter`<`Uint8Array`\> | Stream for outbound messages. |

#### Returns

[`StateManager`](dxos_model_factory.StateManager.md)<`M`\>

#### Defined in

[packages/core/echo/model-factory/src/model-factory.ts:65](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model-factory.ts#L65)

___

### getModel

**getModel**(`model_type`): `undefined` \| { `constructor`: [`ModelConstructor`](../types/dxos_model_factory.ModelConstructor.md)<`any`\> ; `meta`: [`ModelMeta`](../types/dxos_model_factory.ModelMeta.md)<`any`, `any`, `any`\>  }

#### Parameters

| Name | Type |
| :------ | :------ |
| `model_type` | `string` |

#### Returns

`undefined` \| { `constructor`: [`ModelConstructor`](../types/dxos_model_factory.ModelConstructor.md)<`any`\> ; `meta`: [`ModelMeta`](../types/dxos_model_factory.ModelMeta.md)<`any`, `any`, `any`\>  }

#### Defined in

[packages/core/echo/model-factory/src/model-factory.ts:33](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model-factory.ts#L33)

___

### getModelMeta

**getModelMeta**(`model_type`): [`ModelMeta`](../types/dxos_model_factory.ModelMeta.md)<`any`, `any`, `any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `model_type` | `string` |

#### Returns

[`ModelMeta`](../types/dxos_model_factory.ModelMeta.md)<`any`, `any`, `any`\>

#### Defined in

[packages/core/echo/model-factory/src/model-factory.ts:39](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model-factory.ts#L39)

___

### getModels

**getModels**(): { `constructor`: [`ModelConstructor`](../types/dxos_model_factory.ModelConstructor.md)<`any`\> ; `meta`: [`ModelMeta`](../types/dxos_model_factory.ModelMeta.md)<`any`, `any`, `any`\>  }[]

#### Returns

{ `constructor`: [`ModelConstructor`](../types/dxos_model_factory.ModelConstructor.md)<`any`\> ; `meta`: [`ModelMeta`](../types/dxos_model_factory.ModelMeta.md)<`any`, `any`, `any`\>  }[]

#### Defined in

[packages/core/echo/model-factory/src/model-factory.ts:29](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model-factory.ts#L29)

___

### hasModel

**hasModel**(`model_type`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `model_type` | `string` |

#### Returns

`boolean`

#### Defined in

[packages/core/echo/model-factory/src/model-factory.ts:25](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model-factory.ts#L25)

___

### registerModel

**registerModel**(`constructor`): [`ModelFactory`](dxos_model_factory.ModelFactory.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `constructor` | [`ModelConstructor`](../types/dxos_model_factory.ModelConstructor.md)<`any`\> |

#### Returns

[`ModelFactory`](dxos_model_factory.ModelFactory.md)

#### Defined in

[packages/core/echo/model-factory/src/model-factory.ts:49](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/model-factory.ts#L49)
