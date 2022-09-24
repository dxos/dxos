# Interface: MMSTTopologyOptions

[@dxos/network-manager](../modules/dxos_network_manager.md).MMSTTopologyOptions

## Table of contents

### Properties

- [maxPeers](dxos_network_manager.MMSTTopologyOptions.md#maxpeers)
- [originateConnections](dxos_network_manager.MMSTTopologyOptions.md#originateconnections)
- [sampleSize](dxos_network_manager.MMSTTopologyOptions.md#samplesize)

## Properties

### maxPeers

• `Optional` **maxPeers**: `number`

Maximum number of connections allowed, all other connections will be dropped.

#### Defined in

[packages/mesh/network-manager/src/topology/mmst-topology.ts:22](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/mmst-topology.ts#L22)

___

### originateConnections

• `Optional` **originateConnections**: `number`

Number of connections the peer will originate by itself.

#### Defined in

[packages/mesh/network-manager/src/topology/mmst-topology.ts:17](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/mmst-topology.ts#L17)

___

### sampleSize

• `Optional` **sampleSize**: `number`

Size of random sample from which peer candidates are selected.

#### Defined in

[packages/mesh/network-manager/src/topology/mmst-topology.ts:27](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/mmst-topology.ts#L27)
