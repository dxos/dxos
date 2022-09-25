# Function: protocolFactory

[@dxos/network-manager](../modules/dxos_network_manager.md).protocolFactory

**protocolFactory**(`__namedParameters`): [`ProtocolProvider`](../types/dxos_network_manager.ProtocolProvider.md)

Returns a function that takes a channel parameter, returns a Protocol object
with its context set to channel, plugins from plugins parameter and session
set to session parameter.

**`Deprecated`**

Use `createProtocolFactory`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `ProtocolFactoryOptions` |

#### Returns

[`ProtocolProvider`](../types/dxos_network_manager.ProtocolProvider.md)

#### Defined in

[packages/mesh/network-manager/src/protocol-factory.ts:29](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/protocol-factory.ts#L29)
