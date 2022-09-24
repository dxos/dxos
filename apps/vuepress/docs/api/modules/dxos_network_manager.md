# Module: @dxos/network-manager

## Table of contents

### Enumerations

- [ConnectionState](../enums/dxos_network_manager.ConnectionState.md)

### Classes

- [Connection](../classes/dxos_network_manager.Connection.md)
- [ConnectionLog](../classes/dxos_network_manager.ConnectionLog.md)
- [FullyConnectedTopology](../classes/dxos_network_manager.FullyConnectedTopology.md)
- [InMemoryTransport](../classes/dxos_network_manager.InMemoryTransport.md)
- [MMSTTopology](../classes/dxos_network_manager.MMSTTopology.md)
- [MessageRouter](../classes/dxos_network_manager.MessageRouter.md)
- [NetworkManager](../classes/dxos_network_manager.NetworkManager.md)
- [StarTopology](../classes/dxos_network_manager.StarTopology.md)
- [Swarm](../classes/dxos_network_manager.Swarm.md)
- [SwarmMapper](../classes/dxos_network_manager.SwarmMapper.md)
- [WebRTCTransport](../classes/dxos_network_manager.WebRTCTransport.md)

### Interfaces

- [ConnectionInfo](../interfaces/dxos_network_manager.ConnectionInfo.md)
- [MMSTTopologyOptions](../interfaces/dxos_network_manager.MMSTTopologyOptions.md)
- [NetworkManagerOptions](../interfaces/dxos_network_manager.NetworkManagerOptions.md)
- [OfferMessage](../interfaces/dxos_network_manager.OfferMessage.md)
- [PeerInfo](../interfaces/dxos_network_manager.PeerInfo.md)
- [Plugin](../interfaces/dxos_network_manager.Plugin.md)
- [SignalConnection](../interfaces/dxos_network_manager.SignalConnection.md)
- [SignalMessage](../interfaces/dxos_network_manager.SignalMessage.md)
- [SignalMessaging](../interfaces/dxos_network_manager.SignalMessaging.md)
- [SwarmController](../interfaces/dxos_network_manager.SwarmController.md)
- [SwarmInfo](../interfaces/dxos_network_manager.SwarmInfo.md)
- [SwarmOptions](../interfaces/dxos_network_manager.SwarmOptions.md)
- [SwarmState](../interfaces/dxos_network_manager.SwarmState.md)
- [Topology](../interfaces/dxos_network_manager.Topology.md)
- [Transport](../interfaces/dxos_network_manager.Transport.md)
- [TransportOptions](../interfaces/dxos_network_manager.TransportOptions.md)

### Type Aliases

- [ConnectionEvent](dxos_network_manager.md#connectionevent)
- [PeerState](dxos_network_manager.md#peerstate)
- [ProtocolProvider](dxos_network_manager.md#protocolprovider)
- [Topic](dxos_network_manager.md#topic)
- [TransportFactory](dxos_network_manager.md#transportfactory)

### Functions

- [createProtocolFactory](dxos_network_manager.md#createprotocolfactory)
- [createWebRTCTransportFactory](dxos_network_manager.md#createwebrtctransportfactory)
- [inMemoryTransportFactory](dxos_network_manager.md#inmemorytransportfactory)
- [protocolFactory](dxos_network_manager.md#protocolfactory)
- [transportProtocolProvider](dxos_network_manager.md#transportprotocolprovider)

## Type Aliases

### ConnectionEvent

Ƭ **ConnectionEvent**: { `newState`: [`ConnectionState`](../enums/dxos_network_manager.ConnectionState.md) ; `type`: ``"CONNECTION_STATE_CHANGED"``  } \| { `error`: `string` ; `type`: ``"PROTOCOL_ERROR"``  } \| { `type`: ``"PROTOCOL_EXTENSIONS_INITIALIZED"``  } \| { `type`: ``"PROTOCOL_EXTENSIONS_HANDSHAKE"``  } \| { `type`: ``"PROTOCOL_HANDSHAKE"``  }

#### Defined in

[packages/mesh/network-manager/src/connection-log.ts:29](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/connection-log.ts#L29)

___

### PeerState

Ƭ **PeerState**: [`ConnectionState`](../enums/dxos_network_manager.ConnectionState.md) \| ``"INDIRECTLY_CONNECTED"`` \| ``"ME"``

State of the connection to the remote peer with additional info derived from network mapping.

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm-mapper.ts:17](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/swarm/swarm-mapper.ts#L17)

___

### ProtocolProvider

Ƭ **ProtocolProvider**: (`opts`: { `channel`: `Buffer` ; `initiator`: `boolean`  }) => `Protocol`

#### Type declaration

▸ (`opts`): `Protocol`

##### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.channel` | `Buffer` |
| `opts.initiator` | `boolean` |

##### Returns

`Protocol`

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:21](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L21)

___

### Topic

Ƭ **Topic**: `PublicKey`

Swarm topic.

#### Defined in

[packages/mesh/network-manager/src/types.ts:10](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/types.ts#L10)

___

### TransportFactory

Ƭ **TransportFactory**: (`options`: [`TransportOptions`](../interfaces/dxos_network_manager.TransportOptions.md)) => [`Transport`](../interfaces/dxos_network_manager.Transport.md)

#### Type declaration

▸ (`options`): [`Transport`](../interfaces/dxos_network_manager.Transport.md)

##### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`TransportOptions`](../interfaces/dxos_network_manager.TransportOptions.md) |

##### Returns

[`Transport`](../interfaces/dxos_network_manager.Transport.md)

#### Defined in

[packages/mesh/network-manager/src/transport/transport.ts:45](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/transport/transport.ts#L45)

## Functions

### createProtocolFactory

▸ **createProtocolFactory**(`topic`, `peerId`, `plugins`): [`ProtocolProvider`](dxos_network_manager.md#protocolprovider)

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `PublicKey` |
| `peerId` | `PublicKey` |
| `plugins` | [`Plugin`](../interfaces/dxos_network_manager.Plugin.md)[] |

#### Returns

[`ProtocolProvider`](dxos_network_manager.md#protocolprovider)

#### Defined in

[packages/mesh/network-manager/src/protocol-factory.ts:61](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/protocol-factory.ts#L61)

___

### createWebRTCTransportFactory

▸ **createWebRTCTransportFactory**(`webrtcConfig?`): [`TransportFactory`](dxos_network_manager.md#transportfactory)

#### Parameters

| Name | Type |
| :------ | :------ |
| `webrtcConfig?` | `any` |

#### Returns

[`TransportFactory`](dxos_network_manager.md#transportfactory)

#### Defined in

[packages/mesh/network-manager/src/transport/webrtc-transport.ts:109](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/transport/webrtc-transport.ts#L109)

___

### inMemoryTransportFactory

▸ **inMemoryTransportFactory**(`options`): [`Transport`](../interfaces/dxos_network_manager.Transport.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`TransportOptions`](../interfaces/dxos_network_manager.TransportOptions.md) |

#### Returns

[`Transport`](../interfaces/dxos_network_manager.Transport.md)

#### Defined in

[packages/mesh/network-manager/src/transport/transport.ts:45](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/transport/transport.ts#L45)

___

### protocolFactory

▸ **protocolFactory**(`__namedParameters`): [`ProtocolProvider`](dxos_network_manager.md#protocolprovider)

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

[`ProtocolProvider`](dxos_network_manager.md#protocolprovider)

#### Defined in

[packages/mesh/network-manager/src/protocol-factory.ts:29](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/protocol-factory.ts#L29)

___

### transportProtocolProvider

▸ **transportProtocolProvider**(`rendezvousKey`, `peerId`, `protocolPlugin`): [`ProtocolProvider`](dxos_network_manager.md#protocolprovider)

Creates a ProtocolProvider for simple transport connections with only one protocol plugin.

**`Deprecated`**

Use `createProtocolFactory`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `rendezvousKey` | `Buffer` |
| `peerId` | `Buffer` |
| `protocolPlugin` | `any` |

#### Returns

[`ProtocolProvider`](dxos_network_manager.md#protocolprovider)

#### Defined in

[packages/mesh/network-manager/src/protocol-factory.ts:71](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/protocol-factory.ts#L71)
