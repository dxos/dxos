# Function: createProtoRpcPeer

[@dxos/rpc](../modules/dxos_rpc.md).createProtoRpcPeer

**createProtoRpcPeer**<`Client`, `Server`\>(`__namedParameters`): [`ProtoRpcPeer`](../classes/dxos_rpc.ProtoRpcPeer.md)<`Client`\>

Create type-safe RPC peer from a service bundle.
Can both handle and issue requests.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Client` | {} |
| `Server` | {} |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ProtoRpcPeerOptions`](../interfaces/dxos_rpc.ProtoRpcPeerOptions.md)<`Client`, `Server`\> |

#### Returns

[`ProtoRpcPeer`](../classes/dxos_rpc.ProtoRpcPeer.md)<`Client`\>

#### Defined in

[packages/core/mesh/rpc/src/service.ts:60](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/service.ts#L60)
