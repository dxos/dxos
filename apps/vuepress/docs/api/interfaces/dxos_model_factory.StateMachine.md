# Interface: StateMachine<TState, TMutation, TSnapshot\>

[@dxos/model-factory](../modules/dxos_model_factory.md).StateMachine

Manages state and state transitions vis mutations.

## Type parameters

| Name |
| :------ |
| `TState` |
| `TMutation` |
| `TSnapshot` |

## Table of contents

### Methods

- [getState](dxos_model_factory.StateMachine.md#getstate)
- [process](dxos_model_factory.StateMachine.md#process)
- [reset](dxos_model_factory.StateMachine.md#reset)
- [snapshot](dxos_model_factory.StateMachine.md#snapshot)

## Methods

### getState

▸ **getState**(): `TState`

#### Returns

`TState`

#### Defined in

[packages/echo/model-factory/src/types.ts:48](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/model-factory/src/types.ts#L48)

___

### process

▸ **process**(`mutation`, `meta`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `mutation` | `TMutation` |
| `meta` | [`MutationProcessMeta`](dxos_model_factory.MutationProcessMeta.md) |

#### Returns

`void`

#### Defined in

[packages/echo/model-factory/src/types.ts:50](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/model-factory/src/types.ts#L50)

___

### reset

▸ **reset**(`snapshot`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `snapshot` | `TSnapshot` |

#### Returns

`void`

#### Defined in

[packages/echo/model-factory/src/types.ts:49](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/model-factory/src/types.ts#L49)

___

### snapshot

▸ **snapshot**(): `TSnapshot`

#### Returns

`TSnapshot`

#### Defined in

[packages/echo/model-factory/src/types.ts:51](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/model-factory/src/types.ts#L51)
