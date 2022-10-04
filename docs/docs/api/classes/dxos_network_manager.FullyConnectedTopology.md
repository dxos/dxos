# Class: FullyConnectedTopology

[@dxos/network-manager](../modules/dxos_network_manager.md).FullyConnectedTopology

## Implements

- [`Topology`](../interfaces/dxos_network_manager.Topology.md)

## Constructors

### constructor

**new FullyConnectedTopology**()

## Properties

### \_controller

 `Private` `Optional` **\_controller**: [`SwarmController`](../interfaces/dxos_network_manager.SwarmController.md)

#### Defined in

[packages/core/mesh/network-manager/src/topology/fully-connected-topology.ts:12](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/topology/fully-connected-topology.ts#L12)

## Methods

### destroy

**destroy**(): `Promise`<`void`\>

Called when swarm is destroyed or topology is changed.

Any error thrown here will be a critical error for the swarm.

#### Returns

`Promise`<`void`\>

#### Implementation of

[Topology](../interfaces/dxos_network_manager.Topology.md).[destroy](../interfaces/dxos_network_manager.Topology.md#destroy)

#### Defined in

[packages/core/mesh/network-manager/src/topology/fully-connected-topology.ts:31](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/topology/fully-connected-topology.ts#L31)

___

### init

**init**(`controller`): `void`

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

[packages/core/mesh/network-manager/src/topology/fully-connected-topology.ts:14](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/topology/fully-connected-topology.ts#L14)

___

### onOffer

**onOffer**(`peer`): `Promise`<`boolean`\>

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

[packages/core/mesh/network-manager/src/topology/fully-connected-topology.ts:27](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/topology/fully-connected-topology.ts#L27)

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/core/mesh/network-manager/src/topology/fully-connected-topology.ts:35](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/topology/fully-connected-topology.ts#L35)

___

### update

**update**(): `void`

Called when swarm state is updated.

#### Returns

`void`

#### Implementation of

[Topology](../interfaces/dxos_network_manager.Topology.md).[update](../interfaces/dxos_network_manager.Topology.md#update)

#### Defined in

[packages/core/mesh/network-manager/src/topology/fully-connected-topology.ts:19](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/topology/fully-connected-topology.ts#L19)
