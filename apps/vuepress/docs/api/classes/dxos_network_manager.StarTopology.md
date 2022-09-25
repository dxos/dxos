# Class: StarTopology

[@dxos/network-manager](../modules/dxos_network_manager.md).StarTopology

## Implements

- [`Topology`](../interfaces/dxos_network_manager.Topology.md)

## Constructors

### constructor

**new StarTopology**(`_centralPeer`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_centralPeer` | `PublicKey` |

#### Defined in

[packages/mesh/network-manager/src/topology/star-topology.ts:15](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/topology/star-topology.ts#L15)

## Properties

### \_controller

 `Private` `Optional` **\_controller**: [`SwarmController`](../interfaces/dxos_network_manager.SwarmController.md)

#### Defined in

[packages/mesh/network-manager/src/topology/star-topology.ts:13](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/topology/star-topology.ts#L13)

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

[packages/mesh/network-manager/src/topology/star-topology.ts:58](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/topology/star-topology.ts#L58)

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

[packages/mesh/network-manager/src/topology/star-topology.ts:23](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/topology/star-topology.ts#L23)

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

[packages/mesh/network-manager/src/topology/star-topology.ts:51](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/topology/star-topology.ts#L51)

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/mesh/network-manager/src/topology/star-topology.ts:19](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/topology/star-topology.ts#L19)

___

### update

**update**(): `void`

Called when swarm state is updated.

#### Returns

`void`

#### Implementation of

[Topology](../interfaces/dxos_network_manager.Topology.md).[update](../interfaces/dxos_network_manager.Topology.md#update)

#### Defined in

[packages/mesh/network-manager/src/topology/star-topology.ts:28](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/topology/star-topology.ts#L28)
