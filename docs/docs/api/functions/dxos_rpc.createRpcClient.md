# Function: createRpcClient

[@dxos/rpc](../modules/dxos_rpc.md).createRpcClient

**createRpcClient**<`S`\>(`serviceDef`, `options`): [`ProtoRpcPeer`](../classes/dxos_rpc.ProtoRpcPeer.md)<`S`\>

Create a type-safe RPC client.

**`Deprecated`**

Use createProtoRpcPeer instead.

#### Type parameters

| Name |
| :------ |
| `S` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `serviceDef` | `ServiceDescriptor`<`S`\> |
| `options` | `Omit`<[`RpcPeerOptions`](../interfaces/dxos_rpc.RpcPeerOptions.md), ``"messageHandler"``\> |

#### Returns

[`ProtoRpcPeer`](../classes/dxos_rpc.ProtoRpcPeer.md)<`S`\>

#### Defined in

[packages/core/mesh/rpc/src/service.ts:112](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/service.ts#L112)
