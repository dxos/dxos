# Interface: StateMachine<TState, TMutation, TSnapshot\>

[@dxos/model-factory](../modules/dxos_model_factory.md).StateMachine

Manages state and state transitions vis mutations.

## Type parameters

| Name |
| :------ |
| `TState` |
| `TMutation` |
| `TSnapshot` |

## Methods

### getState

**getState**(): `TState`

#### Returns

`TState`

#### Defined in

[packages/core/echo/model-factory/src/types.ts:49](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/types.ts#L49)

___

### process

**process**(`mutation`, `meta`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `mutation` | `TMutation` |
| `meta` | [`MutationProcessMeta`](dxos_model_factory.MutationProcessMeta.md) |

#### Returns

`void`

#### Defined in

[packages/core/echo/model-factory/src/types.ts:51](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/types.ts#L51)

___

### reset

**reset**(`snapshot`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `snapshot` | `TSnapshot` |

#### Returns

`void`

#### Defined in

[packages/core/echo/model-factory/src/types.ts:50](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/types.ts#L50)

___

### snapshot

**snapshot**(): `TSnapshot`

#### Returns

`TSnapshot`

#### Defined in

[packages/core/echo/model-factory/src/types.ts:52](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/types.ts#L52)
