---
id: "dxos_model_factory.StateMachine"
title: "Interface: StateMachine<TState, TMutation, TSnapshot>"
sidebar_label: "StateMachine"
custom_edit_url: null
---

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

▸ **getState**(): `TState`

#### Returns

`TState`

#### Defined in

[packages/echo/model-factory/src/types.ts:48](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/model-factory/src/types.ts#L48)

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

[packages/echo/model-factory/src/types.ts:50](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/model-factory/src/types.ts#L50)

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

[packages/echo/model-factory/src/types.ts:49](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/model-factory/src/types.ts#L49)

___

### snapshot

▸ **snapshot**(): `TSnapshot`

#### Returns

`TSnapshot`

#### Defined in

[packages/echo/model-factory/src/types.ts:51](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/model-factory/src/types.ts#L51)
