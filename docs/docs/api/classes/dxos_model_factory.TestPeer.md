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

[packages/core/echo/model-factory/src/testing/test-rig.ts:131](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/testing/test-rig.ts#L131)

## Properties

### key

 `Readonly` **key**: `PublicKey`

#### Defined in

[packages/core/echo/model-factory/src/testing/test-rig.ts:133](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/testing/test-rig.ts#L133)

___

### mutations

 **mutations**: [`ModelMessage`](../types/dxos_model_factory.ModelMessage.md)<`Uint8Array`\>[] = `[]`

#### Defined in

[packages/core/echo/model-factory/src/testing/test-rig.ts:129](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/testing/test-rig.ts#L129)

___

### stateManager

 `Readonly` **stateManager**: [`StateManager`](dxos_model_factory.StateManager.md)<`M`\>

#### Defined in

[packages/core/echo/model-factory/src/testing/test-rig.ts:132](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/testing/test-rig.ts#L132)

___

### timeframe

 **timeframe**: `Timeframe`

#### Defined in

[packages/core/echo/model-factory/src/testing/test-rig.ts:127](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/testing/test-rig.ts#L127)

## Accessors

### model

`get` **model**(): `M`

#### Returns

`M`

#### Defined in

[packages/core/echo/model-factory/src/testing/test-rig.ts:136](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/testing/test-rig.ts#L136)

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

[packages/core/echo/model-factory/src/testing/test-rig.ts:140](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/testing/test-rig.ts#L140)
