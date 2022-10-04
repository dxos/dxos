# Class: TestRig<M\>

[@dxos/model-factory](../modules/dxos_model_factory.md).TestRig

## Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends [`Model`](dxos_model_factory.Model.md)<`any`\> |

## Constructors

### constructor

**new TestRig**<`M`\>(`_modelFactory`, `_modelConstructor`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends [`Model`](dxos_model_factory.Model.md)<`any`, `any`, `M`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `_modelFactory` | [`ModelFactory`](dxos_model_factory.ModelFactory.md) |
| `_modelConstructor` | [`ModelConstructor`](../types/dxos_model_factory.ModelConstructor.md)<`M`\> |

#### Defined in

[packages/core/echo/model-factory/src/testing/test-rig.ts:28](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/testing/test-rig.ts#L28)

## Properties

### \_peers

 `Private` `Readonly` **\_peers**: `ComplexMap`<`PublicKey`, [`TestPeer`](dxos_model_factory.TestPeer.md)<`M`\>\>

#### Defined in

[packages/core/echo/model-factory/src/testing/test-rig.ts:22](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/testing/test-rig.ts#L22)

___

### \_replicating

 `Private` **\_replicating**: `boolean` = `true`

#### Defined in

[packages/core/echo/model-factory/src/testing/test-rig.ts:26](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/testing/test-rig.ts#L26)

___

### \_replicationFinished

 `Private` `Readonly` **\_replicationFinished**: `Trigger`

#### Defined in

[packages/core/echo/model-factory/src/testing/test-rig.ts:24](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/testing/test-rig.ts#L24)

## Accessors

### replicating

`get` **replicating**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/core/echo/model-factory/src/testing/test-rig.ts:35](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/testing/test-rig.ts#L35)

## Methods

### \_replicate

`Private` **_replicate**(): `void`

#### Returns

`void`

#### Defined in

[packages/core/echo/model-factory/src/testing/test-rig.ts:103](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/testing/test-rig.ts#L103)

___

### \_writeMessage

`Private` **_writeMessage**(`peerKey`, `mutation`): `WriteReceipt`

#### Parameters

| Name | Type |
| :------ | :------ |
| `peerKey` | `PublicKey` |
| `mutation` | `Uint8Array` |

#### Returns

`WriteReceipt`

#### Defined in

[packages/core/echo/model-factory/src/testing/test-rig.ts:68](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/testing/test-rig.ts#L68)

___

### configureReplication

**configureReplication**(`value`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `boolean` |

#### Returns

`void`

#### Defined in

[packages/core/echo/model-factory/src/testing/test-rig.ts:39](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/testing/test-rig.ts#L39)

___

### createPeer

**createPeer**(): [`TestPeer`](dxos_model_factory.TestPeer.md)<`M`\>

#### Returns

[`TestPeer`](dxos_model_factory.TestPeer.md)<`M`\>

#### Defined in

[packages/core/echo/model-factory/src/testing/test-rig.ts:50](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/testing/test-rig.ts#L50)

___

### waitForReplication

**waitForReplication**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/model-factory/src/testing/test-rig.ts:44](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/testing/test-rig.ts#L44)
