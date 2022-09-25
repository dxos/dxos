# Class: TestPeer<M\>

[@dxos/model-factory](../modules/dxos_model_factory.md).TestPeer

## Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends [`Model`](dxos_model_factory.Model.md) |

## Constructors

### constructor

**new TestPeer**<`M`\>(`stateManager`, `key`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends [`Model`](dxos_model_factory.Model.md)<`any`, `any`, `M`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `stateManager` | [`StateManager`](dxos_model_factory.StateManager.md)<`M`\> |
| `key` | `PublicKey` |

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:130](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/model-factory/src/testing/test-rig.ts#L130)

## Properties

### key

 `Readonly` **key**: `PublicKey`

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:132](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/model-factory/src/testing/test-rig.ts#L132)

___

### mutations

 **mutations**: [`ModelMessage`](../types/dxos_model_factory.ModelMessage.md)<`Uint8Array`\>[] = `[]`

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:128](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/model-factory/src/testing/test-rig.ts#L128)

___

### stateManager

 `Readonly` **stateManager**: [`StateManager`](dxos_model_factory.StateManager.md)<`M`\>

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:131](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/model-factory/src/testing/test-rig.ts#L131)

___

### timeframe

 **timeframe**: `Timeframe`

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:126](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/model-factory/src/testing/test-rig.ts#L126)

## Accessors

### model

`get` **model**(): `M`

#### Returns

`M`

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:135](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/model-factory/src/testing/test-rig.ts#L135)

## Methods

### processMutation

**processMutation**(`message`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | [`ModelMessage`](../types/dxos_model_factory.ModelMessage.md)<`Uint8Array`\> |

#### Returns

`void`

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:139](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/model-factory/src/testing/test-rig.ts#L139)
