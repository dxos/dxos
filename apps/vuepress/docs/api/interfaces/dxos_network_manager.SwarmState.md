# Interface: SwarmState

[@dxos/network-manager](../modules/dxos_network_manager.md).SwarmState

## Properties

### candidates

 **candidates**: `PublicKey`[]

Candidates for connection. Does not intersect with a set of already connected peers.

#### Defined in

[packages/mesh/network-manager/src/topology/topology.ts:38](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/topology/topology.ts#L38)

___

### connected

 **connected**: `PublicKey`[]

Peers with established connections.

#### Defined in

[packages/mesh/network-manager/src/topology/topology.ts:33](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/topology/topology.ts#L33)

___

### ownPeerId

 **ownPeerId**: `PublicKey`

This node's peer Id.

#### Defined in

[packages/mesh/network-manager/src/topology/topology.ts:28](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/topology/topology.ts#L28)
