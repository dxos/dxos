# Class: MMSTTopology

[@dxos/network-manager](../modules/dxos_network_manager.md).MMSTTopology

## Implements

- [`Topology`](../interfaces/dxos_network_manager.Topology.md)

## Table of contents

### Constructors

- [constructor](dxos_network_manager.MMSTTopology.md#constructor)

### Properties

- [\_controller](dxos_network_manager.MMSTTopology.md#_controller)
- [\_maxPeers](dxos_network_manager.MMSTTopology.md#_maxpeers)
- [\_originateConnections](dxos_network_manager.MMSTTopology.md#_originateconnections)
- [\_sampleCollected](dxos_network_manager.MMSTTopology.md#_samplecollected)
- [\_sampleSize](dxos_network_manager.MMSTTopology.md#_samplesize)

### Methods

- [\_runAlgorithm](dxos_network_manager.MMSTTopology.md#_runalgorithm)
- [destroy](dxos_network_manager.MMSTTopology.md#destroy)
- [init](dxos_network_manager.MMSTTopology.md#init)
- [onOffer](dxos_network_manager.MMSTTopology.md#onoffer)
- [toString](dxos_network_manager.MMSTTopology.md#tostring)
- [update](dxos_network_manager.MMSTTopology.md#update)

## Constructors

### constructor

• **new MMSTTopology**(`__namedParameters?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`MMSTTopologyOptions`](../interfaces/dxos_network_manager.MMSTTopologyOptions.md) |

#### Defined in

[packages/mesh/network-manager/src/topology/mmst-topology.ts:39](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/mmst-topology.ts#L39)

## Properties

### \_controller

• `Private` `Optional` **\_controller**: [`SwarmController`](../interfaces/dxos_network_manager.SwarmController.md)

#### Defined in

[packages/mesh/network-manager/src/topology/mmst-topology.ts:35](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/mmst-topology.ts#L35)

___

### \_maxPeers

• `Private` `Readonly` **\_maxPeers**: `number`

#### Defined in

[packages/mesh/network-manager/src/topology/mmst-topology.ts:32](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/mmst-topology.ts#L32)

___

### \_originateConnections

• `Private` `Readonly` **\_originateConnections**: `number`

#### Defined in

[packages/mesh/network-manager/src/topology/mmst-topology.ts:31](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/mmst-topology.ts#L31)

___

### \_sampleCollected

• `Private` **\_sampleCollected**: `boolean` = `false`

#### Defined in

[packages/mesh/network-manager/src/topology/mmst-topology.ts:37](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/mmst-topology.ts#L37)

___

### \_sampleSize

• `Private` `Readonly` **\_sampleSize**: `number`

#### Defined in

[packages/mesh/network-manager/src/topology/mmst-topology.ts:33](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/mmst-topology.ts#L33)

## Methods

### \_runAlgorithm

▸ `Private` **_runAlgorithm**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/network-manager/src/topology/mmst-topology.ts:77](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/mmst-topology.ts#L77)

___

### destroy

▸ **destroy**(): `Promise`<`void`\>

Called when swarm is destroyed or topology is changed.

Any error thrown here will be a critical error for the swarm.

#### Returns

`Promise`<`void`\>

#### Implementation of

[Topology](../interfaces/dxos_network_manager.Topology.md).[destroy](../interfaces/dxos_network_manager.Topology.md#destroy)

#### Defined in

[packages/mesh/network-manager/src/topology/mmst-topology.ts:73](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/mmst-topology.ts#L73)

___

### init

▸ **init**(`controller`): `void`

Called when swarm is created.

May be used to bind the swarm controller and initialize any asynchronous actions.

#### Parameters

| Name | Type |
| :------ | :------ |
| `controller` | [`SwarmController`](../interfaces/dxos_network_manager.SwarmController.md) |

#### Returns

`void`

#### Implementation of

[Topology](../interfaces/dxos_network_manager.Topology.md).[init](../interfaces/dxos_network_manager.Topology.md#init)

#### Defined in

[packages/mesh/network-manager/src/topology/mmst-topology.ts:49](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/mmst-topology.ts#L49)

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

#### Implementation of

[Topology](../interfaces/dxos_network_manager.Topology.md).[onOffer](../interfaces/dxos_network_manager.Topology.md#onoffer)

#### Defined in

[packages/mesh/network-manager/src/topology/mmst-topology.ts:65](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/mmst-topology.ts#L65)

___

### toString

▸ **toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/mesh/network-manager/src/topology/mmst-topology.ts:99](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/mmst-topology.ts#L99)

___

### update

▸ **update**(): `void`

Called when swarm state is updated.

#### Returns

`void`

#### Implementation of

[Topology](../interfaces/dxos_network_manager.Topology.md).[update](../interfaces/dxos_network_manager.Topology.md#update)

#### Defined in

[packages/mesh/network-manager/src/topology/mmst-topology.ts:54](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/topology/mmst-topology.ts#L54)
