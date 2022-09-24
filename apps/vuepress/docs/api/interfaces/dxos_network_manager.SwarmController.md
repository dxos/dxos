# Interface: SwarmController

[@dxos/network-manager](../modules/dxos_network_manager.md).SwarmController

## Table of contents

### Methods

- [connect](dxos_network_manager.SwarmController.md#connect)
- [disconnect](dxos_network_manager.SwarmController.md#disconnect)
- [getState](dxos_network_manager.SwarmController.md#getstate)

## Methods

### connect

▸ **connect**(`peer`): `void`

Initiate a connection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `peer` | `PublicKey` |

#### Returns

`void`

#### Defined in

[packages/mesh/network-manager/src/topology/topology.ts:16](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/topology/topology.ts#L16)

___

### disconnect

▸ **disconnect**(`peer`): `void`

Disconnect from a peer.

#### Parameters

| Name | Type |
| :------ | :------ |
| `peer` | `PublicKey` |

#### Returns

`void`

#### Defined in

[packages/mesh/network-manager/src/topology/topology.ts:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/topology/topology.ts#L21)

___

### getState

▸ **getState**(): [`SwarmState`](dxos_network_manager.SwarmState.md)

Get current state.

#### Returns

[`SwarmState`](dxos_network_manager.SwarmState.md)

#### Defined in

[packages/mesh/network-manager/src/topology/topology.ts:11](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/topology/topology.ts#L11)
