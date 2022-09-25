# Interface: SwarmOptions

[@dxos/network-manager](../modules/dxos_network_manager.md).SwarmOptions

## Properties

### label

 `Optional` **label**: `string`

Custom label assigned to this swarm. Used in devtools to display human-readable names for swarms.

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:249](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/network-manager.ts#L249)

___

### peerId

 **peerId**: `PublicKey`

This node's peer id.

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:229](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/network-manager.ts#L229)

___

### presence

 `Optional` **presence**: `any`

Presence plugin for network mapping, if exists.

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:244](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/network-manager.ts#L244)

___

### protocol

 **protocol**: [`ProtocolProvider`](../types/dxos_network_manager.ProtocolProvider.md)

Protocol to use for every connection.

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:239](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/network-manager.ts#L239)

___

### topic

 **topic**: `PublicKey`

Swarm topic.

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:224](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/network-manager.ts#L224)

___

### topology

 **topology**: [`Topology`](dxos_network_manager.Topology.md)

Requested topology. Must be a new instance for every swarm.

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:234](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/network-manager.ts#L234)
