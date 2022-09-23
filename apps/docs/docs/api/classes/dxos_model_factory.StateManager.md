---
id: "dxos_model_factory.StateManager"
title: "Class: StateManager<M>"
sidebar_label: "StateManager"
custom_edit_url: null
---

[@dxos/model-factory](../modules/dxos_model_factory.md).StateManager

Manages the state machine lifecycle.

Snapshots represent the reified state of a set of mutations up until at a particular Timeframe.
The state machine maintains a queue of optimistic and committed mutations as they are written to the output stream.
Each mutation written to the stream gets a receipt the provides an async callback when the message is written to the store.
If another mutation is written to the store ahead of the optimistic mutation,
then the state machine is rolled back to the previous snapshot,
and the ordered set of mutations since that point is replayed.

The state of the model is formed from the following components (in order):
- The custom snapshot from the initial state.
- The snapshot mutations from the initial state.
- The mutatation queue.
- Optimistic mutations.

## Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends [`Model`](dxos_model_factory.Model.md) |

## Constructors

### constructor

• **new StateManager**<`M`\>(`_modelType`, `modelConstructor`, `_itemId`, `_initialState`, `_memberKey`, `_writeStream`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends [`Model`](dxos_model_factory.Model.md)<`any`, `any`, `M`\> |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_modelType` | `string` | - |
| `modelConstructor` | `undefined` \| [`ModelConstructor`](../modules/dxos_model_factory.md#modelconstructor)<`M`\> | Can be undefined if the registry currently doesn't have this model loaded,  in which case it may be initialized later. |
| `_itemId` | `string` | - |
| `_initialState` | `ModelSnapshot` | - |
| `_memberKey` | `PublicKey` | - |
| `_writeStream` | ``null`` \| `FeedWriter`<`Uint8Array`\> | - |

#### Defined in

[packages/echo/model-factory/src/state-manager.ts:78](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/state-manager.ts#L78)

## Properties

### \_model

• `Private` **\_model**: ``null`` \| `M` = `null`

#### Defined in

[packages/echo/model-factory/src/state-manager.ts:62](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/state-manager.ts#L62)

___

### \_modelMeta

• `Private` **\_modelMeta**: ``null`` \| [`ModelMeta`](../modules/dxos_model_factory.md#modelmeta)<`any`, `any`, `any`\> = `null`

#### Defined in

[packages/echo/model-factory/src/state-manager.ts:60](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/state-manager.ts#L60)

___

### \_mutationProcessed

• `Private` `Readonly` **\_mutationProcessed**: `Event`<`MutationMeta`\>

#### Defined in

[packages/echo/model-factory/src/state-manager.ts:58](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/state-manager.ts#L58)

___

### \_mutations

• `Private` **\_mutations**: [`ModelMessage`](../modules/dxos_model_factory.md#modelmessage)<`Uint8Array`\>[] = `[]`

Mutations that were applied on top of the _snapshot.

#### Defined in

[packages/echo/model-factory/src/state-manager.ts:67](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/state-manager.ts#L67)

___

### \_optimisticMutations

• `Private` **\_optimisticMutations**: `OptimisticMutation`[] = `[]`

Mutations that were optimistically applied and haven't yet passed through the feed store.

#### Defined in

[packages/echo/model-factory/src/state-manager.ts:72](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/state-manager.ts#L72)

___

### \_stateMachine

• `Private` **\_stateMachine**: ``null`` \| [`StateMachine`](../interfaces/dxos_model_factory.StateMachine.md)<[`StateOf`](../modules/dxos_model_factory.md#stateof)<`M`\>, `any`, `unknown`\> = `null`

#### Defined in

[packages/echo/model-factory/src/state-manager.ts:61](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/state-manager.ts#L61)

## Accessors

### initialized

• `get` **initialized**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/model-factory/src/state-manager.ts:91](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/state-manager.ts#L91)

___

### model

• `get` **model**(): `M`

#### Returns

`M`

#### Defined in

[packages/echo/model-factory/src/state-manager.ts:104](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/state-manager.ts#L104)

___

### modelMeta

• `get` **modelMeta**(): [`ModelMeta`](../modules/dxos_model_factory.md#modelmeta)<`any`, `any`, `any`\>

#### Returns

[`ModelMeta`](../modules/dxos_model_factory.md#modelmeta)<`any`, `any`, `any`\>

#### Defined in

[packages/echo/model-factory/src/state-manager.ts:99](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/state-manager.ts#L99)

___

### modelType

• `get` **modelType**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/model-factory/src/state-manager.ts:95](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/state-manager.ts#L95)

## Methods

### \_resetStateMachine

▸ `Private` **_resetStateMachine**(): `void`

Re-creates the state machine based on the current snapshot and enqueued mutations.

#### Returns

`void`

#### Defined in

[packages/echo/model-factory/src/state-manager.ts:168](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/state-manager.ts#L168)

___

### \_write

▸ `Private` **_write**(`mutation`): `Promise`<[`MutationWriteReceipt`](../interfaces/dxos_model_factory.MutationWriteReceipt.md)\>

Writes the mutation to the output stream.

#### Parameters

| Name | Type |
| :------ | :------ |
| `mutation` | [`MutationOf`](../modules/dxos_model_factory.md#mutationof)<`M`\> |

#### Returns

`Promise`<[`MutationWriteReceipt`](../interfaces/dxos_model_factory.MutationWriteReceipt.md)\>

#### Defined in

[packages/echo/model-factory/src/state-manager.ts:112](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/state-manager.ts#L112)

___

### createSnapshot

▸ **createSnapshot**(): `ModelSnapshot`

Create a snapshot of the current state.

#### Returns

`ModelSnapshot`

#### Defined in

[packages/echo/model-factory/src/state-manager.ts:262](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/state-manager.ts#L262)

___

### initialize

▸ **initialize**(`modelConstructor`): `void`

Perform late intitalization.

Only possible if the modelContructor wasn't passed during StateManager's creation.

#### Parameters

| Name | Type |
| :------ | :------ |
| `modelConstructor` | [`ModelConstructor`](../modules/dxos_model_factory.md#modelconstructor)<`M`\> |

#### Returns

`void`

#### Defined in

[packages/echo/model-factory/src/state-manager.ts:205](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/state-manager.ts#L205)

___

### processMessage

▸ **processMessage**(`meta`, `mutation`): `void`

Processes mutations from the inbound stream.

#### Parameters

| Name | Type |
| :------ | :------ |
| `meta` | `MutationMetaWithTimeframe` |
| `mutation` | `Uint8Array` |

#### Returns

`void`

#### Defined in

[packages/echo/model-factory/src/state-manager.ts:224](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/state-manager.ts#L224)

___

### resetToSnapshot

▸ **resetToSnapshot**(`snapshot`): `void`

Reset the state to existing snapshot.

#### Parameters

| Name | Type |
| :------ | :------ |
| `snapshot` | `ModelSnapshot` |

#### Returns

`void`

#### Defined in

[packages/echo/model-factory/src/state-manager.ts:282](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/model-factory/src/state-manager.ts#L282)
