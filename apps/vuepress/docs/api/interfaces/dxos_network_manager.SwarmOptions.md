# Interface: SwarmOptions

[@dxos/network-manager](../modules/dxos_network_manager.md).SwarmOptions

## Table of contents

### Properties

- [label](dxos_network_manager.SwarmOptions.md#label)
- [peerId](dxos_network_manager.SwarmOptions.md#peerid)
- [presence](dxos_network_manager.SwarmOptions.md#presence)
- [protocol](dxos_network_manager.SwarmOptions.md#protocol)
- [topic](dxos_network_manager.SwarmOptions.md#topic)
- [topology](dxos_network_manager.SwarmOptions.md#topology)

## Properties

### label

• `Optional` **label**: `string`

Custom label assigned to this swarm. Used in devtools to display human-readable names for swarms.

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:249](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L249)

___

### peerId

• **peerId**: `PublicKey`

This node's peer id.

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:229](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L229)

___

### presence

• `Optional` **presence**: `any`

Presence plugin for network mapping, if exists.

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:244](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L244)

___

### protocol

• **protocol**: [`ProtocolProvider`](../modules/dxos_network_manager.md#protocolprovider)

Protocol to use for every connection.

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:239](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L239)

___

### topic

• **topic**: `PublicKey`

Swarm topic.

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:224](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L224)

___

### topology

• **topology**: [`Topology`](dxos_network_manager.Topology.md)

Requested topology. Must be a new instance for every swarm.

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:234](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L234)
