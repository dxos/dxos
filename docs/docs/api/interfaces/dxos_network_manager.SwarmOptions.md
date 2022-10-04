# Interface: SwarmOptions

[@dxos/network-manager](../modules/dxos_network_manager.md).SwarmOptions

## Properties

### label

 `Optional` **label**: `string`

Custom label assigned to this swarm. Used in devtools to display human-readable names for swarms.

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:242](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L242)

___

### peer_id

 **peer_id**: `PublicKey`

This node's peer id.

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:222](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L222)

___

### presence

 `Optional` **presence**: `any`

Presence plugin for network mapping, if exists.

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:237](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L237)

___

### protocol

 **protocol**: [`ProtocolProvider`](../types/dxos_network_manager.ProtocolProvider.md)

Protocol to use for every connection.

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:232](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L232)

___

### topic

 **topic**: `PublicKey`

Swarm topic.

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:217](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L217)

___

### topology

 **topology**: [`Topology`](dxos_network_manager.Topology.md)

Requested topology. Must be a new instance for every swarm.

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:227](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L227)
