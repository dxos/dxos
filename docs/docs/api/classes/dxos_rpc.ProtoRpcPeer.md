# Class: ProtoRpcPeer<S\>

[@dxos/rpc](../modules/dxos_rpc.md).ProtoRpcPeer

A type-safe RPC peer.

## Type parameters

| Name |
| :------ |
| `S` |

## Constructors

### constructor

**new ProtoRpcPeer**<`S`\>(`rpc`, `peer`)

#### Type parameters

| Name |
| :------ |
| `S` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `rpc` | `S` |
| `peer` | [`RpcPeer`](dxos_rpc.RpcPeer.md) |

#### Defined in

[packages/core/mesh/rpc/src/service.ts:20](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/service.ts#L20)

## Properties

### rpc

 `Readonly` **rpc**: `S`

#### Defined in

[packages/core/mesh/rpc/src/service.ts:21](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/service.ts#L21)

## Methods

### close

**close**(): `void`

#### Returns

`void`

#### Defined in

[packages/core/mesh/rpc/src/service.ts:29](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/service.ts#L29)

___

### open

**open**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/rpc/src/service.ts:25](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/service.ts#L25)
