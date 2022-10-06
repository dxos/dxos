# Function: transportProtocolProvider

[@dxos/network-manager](../modules/dxos_network_manager.md).transportProtocolProvider

**transportProtocolProvider**(`rendezvous_key`, `peer_id`, `protocolPlugin`): [`ProtocolProvider`](../types/dxos_network_manager.ProtocolProvider.md)

Creates a ProtocolProvider for simple transport connections with only one protocol plugin.

**`Deprecated`**

Use `createProtocolFactory`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `rendezvous_key` | `Buffer` |
| `peer_id` | `Buffer` |
| `protocolPlugin` | `any` |

#### Returns

[`ProtocolProvider`](../types/dxos_network_manager.ProtocolProvider.md)

#### Defined in

[packages/core/mesh/network-manager/src/protocol-factory.ts:71](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/protocol-factory.ts#L71)
