# Class: SwarmMapper

[@dxos/network-manager](../modules/dxos_network_manager.md).SwarmMapper

## Constructors

### constructor

**new SwarmMapper**(`_swarm`, `_presence`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_swarm` | [`Swarm`](dxos_network_manager.Swarm.md) |
| `_presence` | `undefined` \| `PresencePlugin` |

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm-mapper.ts:43](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/swarm-mapper.ts#L43)

## Properties

### \_connectionSubscriptions

 `Private` `Readonly` **\_connectionSubscriptions**: `ComplexMap`<`PublicKey`, `Unsubscribe`\>

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm-mapper.ts:33](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/swarm-mapper.ts#L33)

___

### \_peers

 `Private` `Readonly` **\_peers**: `ComplexMap`<`PublicKey`, [`PeerInfo`](../interfaces/dxos_network_manager.PeerInfo.md)\>

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm-mapper.ts:35](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/swarm-mapper.ts#L35)

___

### \_subscriptions

 `Private` `Readonly` **\_subscriptions**: `SubscriptionGroup`

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm-mapper.ts:31](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/swarm-mapper.ts#L31)

___

### mapUpdated

 `Readonly` **mapUpdated**: `Event`<[`PeerInfo`](../interfaces/dxos_network_manager.PeerInfo.md)[]\>

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm-mapper.ts:41](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/swarm-mapper.ts#L41)

## Accessors

### peers

`get` **peers**(): [`PeerInfo`](../interfaces/dxos_network_manager.PeerInfo.md)[]

#### Returns

[`PeerInfo`](../interfaces/dxos_network_manager.PeerInfo.md)[]

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm-mapper.ts:37](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/swarm-mapper.ts#L37)

## Methods

### \_update

`Private` **_update**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm-mapper.ts:67](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/swarm-mapper.ts#L67)

___

### destroy

**destroy**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm-mapper.ts:106](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/swarm-mapper.ts#L106)
