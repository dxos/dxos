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

[packages/echo/model-factory/src/testing/test-rig.ts:27](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/testing/test-rig.ts#L27)

## Properties

### \_peers

 `Private` `Readonly` **\_peers**: `ComplexMap`<`PublicKey`, [`TestPeer`](dxos_model_factory.TestPeer.md)<`M`\>\>

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:21](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/testing/test-rig.ts#L21)

___

### \_replicating

 `Private` **\_replicating**: `boolean` = `true`

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:25](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/testing/test-rig.ts#L25)

___

### \_replicationFinished

 `Private` `Readonly` **\_replicationFinished**: `Trigger`

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:23](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/testing/test-rig.ts#L23)

## Accessors

### replicating

`get` **replicating**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:34](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/testing/test-rig.ts#L34)

## Methods

### \_replicate

`Private` **_replicate**(): `void`

#### Returns

`void`

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:102](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/testing/test-rig.ts#L102)

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

[packages/echo/model-factory/src/testing/test-rig.ts:67](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/testing/test-rig.ts#L67)

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

[packages/echo/model-factory/src/testing/test-rig.ts:38](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/testing/test-rig.ts#L38)

___

### createPeer

**createPeer**(): [`TestPeer`](dxos_model_factory.TestPeer.md)<`M`\>

#### Returns

[`TestPeer`](dxos_model_factory.TestPeer.md)<`M`\>

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:49](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/testing/test-rig.ts#L49)

___

### waitForReplication

**waitForReplication**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:43](https://github.com/dxos/dxos/blob/main/packages/echo/model-factory/src/testing/test-rig.ts#L43)
