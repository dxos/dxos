# Function: createBundledRpcClient

[@dxos/rpc](../modules/dxos_rpc.md).createBundledRpcClient

**createBundledRpcClient**<`S`\>(`descriptors`, `options`): [`ProtoRpcPeer`](../classes/dxos_rpc.ProtoRpcPeer.md)<`S`\>

Create type-safe RPC client from a service bundle.

**`Deprecated`**

Use createProtoRpcPeer instead.

#### Type parameters

| Name |
| :------ |
| `S` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `descriptors` | [`ServiceBundle`](../types/dxos_rpc.ServiceBundle.md)<`S`\> |
| `options` | `Omit`<[`RpcPeerOptions`](../interfaces/dxos_rpc.RpcPeerOptions.md), ``"messageHandler"`` \| ``"streamHandler"``\> |

#### Returns

[`ProtoRpcPeer`](../classes/dxos_rpc.ProtoRpcPeer.md)<`S`\>

#### Defined in

[packages/core/mesh/rpc/src/service.ts:156](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/service.ts#L156)
