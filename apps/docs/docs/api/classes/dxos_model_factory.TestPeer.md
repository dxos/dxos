---
id: "dxos_model_factory.TestPeer"
title: "Class: TestPeer<M>"
sidebar_label: "TestPeer"
custom_edit_url: null
---

[@dxos/model-factory](../modules/dxos_model_factory.md).TestPeer

## Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends [`Model`](dxos_model_factory.Model.md) |

## Constructors

### constructor

• **new TestPeer**<`M`\>(`stateManager`, `key`)

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

[packages/echo/model-factory/src/testing/test-rig.ts:131](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/testing/test-rig.ts#L131)

## Properties

### key

• `Readonly` **key**: `PublicKey`

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:133](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/testing/test-rig.ts#L133)

___

### mutations

• **mutations**: [`ModelMessage`](../modules/dxos_model_factory.md#modelmessage)<`Uint8Array`\>[] = `[]`

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:129](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/testing/test-rig.ts#L129)

___

### stateManager

• `Readonly` **stateManager**: [`StateManager`](dxos_model_factory.StateManager.md)<`M`\>

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:132](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/testing/test-rig.ts#L132)

___

### timeframe

• **timeframe**: `Timeframe`

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:127](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/testing/test-rig.ts#L127)

## Accessors

### model

• `get` **model**(): `M`

#### Returns

`M`

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:136](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/testing/test-rig.ts#L136)

## Methods

### processMutation

▸ **processMutation**(`message`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | [`ModelMessage`](../modules/dxos_model_factory.md#modelmessage)<`Uint8Array`\> |

#### Returns

`void`

#### Defined in

[packages/echo/model-factory/src/testing/test-rig.ts:140](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/testing/test-rig.ts#L140)
