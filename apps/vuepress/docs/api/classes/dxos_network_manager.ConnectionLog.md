# Class: ConnectionLog

[@dxos/network-manager](../modules/dxos_network_manager.md).ConnectionLog

## Constructors

### constructor

**new ConnectionLog**()

## Properties

### \_swarms

 `Private` `Readonly` **\_swarms**: `ComplexMap`<`PublicKey`, [`SwarmInfo`](../interfaces/dxos_network_manager.SwarmInfo.md)\>

SwarmId => info

#### Defined in

[packages/mesh/network-manager/src/connection-log.ts:47](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/connection-log.ts#L47)

___

### update

 `Readonly` **update**: `Event`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/connection-log.ts:49](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/connection-log.ts#L49)

## Accessors

### swarms

`get` **swarms**(): [`SwarmInfo`](../interfaces/dxos_network_manager.SwarmInfo.md)[]

#### Returns

[`SwarmInfo`](../interfaces/dxos_network_manager.SwarmInfo.md)[]

#### Defined in

[packages/mesh/network-manager/src/connection-log.ts:55](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/connection-log.ts#L55)

## Methods

### getSwarmInfo

**getSwarmInfo**(`swarmId`): [`SwarmInfo`](../interfaces/dxos_network_manager.SwarmInfo.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `swarmId` | `PublicKey` |

#### Returns

[`SwarmInfo`](../interfaces/dxos_network_manager.SwarmInfo.md)

#### Defined in

[packages/mesh/network-manager/src/connection-log.ts:51](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/connection-log.ts#L51)

___

### swarmJoined

**swarmJoined**(`swarm`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `swarm` | [`Swarm`](dxos_network_manager.Swarm.md) |

#### Returns

`void`

#### Defined in

[packages/mesh/network-manager/src/connection-log.ts:59](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/connection-log.ts#L59)

___

### swarmLeft

**swarmLeft**(`swarm`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `swarm` | [`Swarm`](dxos_network_manager.Swarm.md) |

#### Returns

`void`

#### Defined in

[packages/mesh/network-manager/src/connection-log.ts:120](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/connection-log.ts#L120)
