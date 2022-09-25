# Interface: SwarmController

[@dxos/network-manager](../modules/dxos_network_manager.md).SwarmController

## Methods

### connect

**connect**(`peer`): `void`

Initiate a connection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `peer` | `PublicKey` |

#### Returns

`void`

#### Defined in

[packages/mesh/network-manager/src/topology/topology.ts:16](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/topology/topology.ts#L16)

___

### disconnect

**disconnect**(`peer`): `void`

Disconnect from a peer.

#### Parameters

| Name | Type |
| :------ | :------ |
| `peer` | `PublicKey` |

#### Returns

`void`

#### Defined in

[packages/mesh/network-manager/src/topology/topology.ts:21](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/topology/topology.ts#L21)

___

### getState

**getState**(): [`SwarmState`](dxos_network_manager.SwarmState.md)

Get current state.

#### Returns

[`SwarmState`](dxos_network_manager.SwarmState.md)

#### Defined in

[packages/mesh/network-manager/src/topology/topology.ts:11](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/topology/topology.ts#L11)
