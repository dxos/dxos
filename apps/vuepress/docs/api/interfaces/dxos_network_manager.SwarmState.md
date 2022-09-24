# Interface: SwarmState

[@dxos/network-manager](../modules/dxos_network_manager.md).SwarmState

## Table of contents

### Properties

- [candidates](dxos_network_manager.SwarmState.md#candidates)
- [connected](dxos_network_manager.SwarmState.md#connected)
- [ownPeerId](dxos_network_manager.SwarmState.md#ownpeerid)

## Properties

### candidates

• **candidates**: `PublicKey`[]

Candidates for connection. Does not intersect with a set of already connected peers.

#### Defined in

[packages/mesh/network-manager/src/topology/topology.ts:38](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/topology.ts#L38)

___

### connected

• **connected**: `PublicKey`[]

Peers with established connections.

#### Defined in

[packages/mesh/network-manager/src/topology/topology.ts:33](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/topology.ts#L33)

___

### ownPeerId

• **ownPeerId**: `PublicKey`

This node's peer Id.

#### Defined in

[packages/mesh/network-manager/src/topology/topology.ts:28](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/topology.ts#L28)
