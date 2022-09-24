# Interface: Topology

[@dxos/network-manager](../modules/dxos_network_manager.md).Topology

## Implemented by

- [`FullyConnectedTopology`](../classes/dxos_network_manager.FullyConnectedTopology.md)
- [`MMSTTopology`](../classes/dxos_network_manager.MMSTTopology.md)
- [`StarTopology`](../classes/dxos_network_manager.StarTopology.md)

## Table of contents

### Methods

- [destroy](dxos_network_manager.Topology.md#destroy)
- [init](dxos_network_manager.Topology.md#init)
- [onOffer](dxos_network_manager.Topology.md#onoffer)
- [update](dxos_network_manager.Topology.md#update)

## Methods

### destroy

▸ **destroy**(): `Promise`<`void`\>

Called when swarm is destroyed or topology is changed.

Any error thrown here will be a critical error for the swarm.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/topology/topology.ts:68](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/topology/topology.ts#L68)

___

### init

▸ **init**(`controller`): `void`

Called when swarm is created.

May be used to bind the swarm controller and initialize any asynchronous actions.

#### Parameters

| Name | Type |
| :------ | :------ |
| `controller` | [`SwarmController`](dxos_network_manager.SwarmController.md) |

#### Returns

`void`

#### Defined in

[packages/mesh/network-manager/src/topology/topology.ts:49](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/topology/topology.ts#L49)

___

### onOffer

▸ **onOffer**(`peer`): `Promise`<`boolean`\>

Called when remote peer offers a connection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `peer` | `PublicKey` |

#### Returns

`Promise`<`boolean`\>

true - to accept the connection, false - to reject.

#### Defined in

[packages/mesh/network-manager/src/topology/topology.ts:61](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/topology/topology.ts#L61)

___

### update

▸ **update**(): `void`

Called when swarm state is updated.

#### Returns

`void`

#### Defined in

[packages/mesh/network-manager/src/topology/topology.ts:54](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/topology/topology.ts#L54)
