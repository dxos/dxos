# Type alias: ConnectionEvent

[@dxos/network-manager](../modules/dxos_network_manager.md).ConnectionEvent

 **ConnectionEvent**: { `newState`: [`ConnectionState`](../enums/dxos_network_manager.ConnectionState.md) ; `type`: ``"CONNECTION_STATE_CHANGED"``  } \| { `error`: `string` ; `type`: ``"PROTOCOL_ERROR"``  } \| { `type`: ``"PROTOCOL_EXTENSIONS_INITIALIZED"``  } \| { `type`: ``"PROTOCOL_EXTENSIONS_HANDSHAKE"``  } \| { `type`: ``"PROTOCOL_HANDSHAKE"``  }

#### Defined in

[packages/mesh/network-manager/src/connection-log.ts:29](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/connection-log.ts#L29)
