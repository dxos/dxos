# Class: Swarm

[@dxos/network-manager](../modules/dxos_network_manager.md).Swarm

A single peer's view of the swarm.
Manages a set of connections implemented by simple-peer instances.
Routes signal events and maintains swarm topology.

## Table of contents

### Constructors

- [constructor](dxos_network_manager.Swarm.md#constructor)

### Properties

- [\_connections](dxos_network_manager.Swarm.md#_connections)
- [\_discoveredPeers](dxos_network_manager.Swarm.md#_discoveredpeers)
- [connected](dxos_network_manager.Swarm.md#connected)
- [connectionAdded](dxos_network_manager.Swarm.md#connectionadded)
- [connectionRemoved](dxos_network_manager.Swarm.md#connectionremoved)
- [errors](dxos_network_manager.Swarm.md#errors)
- [id](dxos_network_manager.Swarm.md#id)

### Accessors

- [connections](dxos_network_manager.Swarm.md#connections)
- [label](dxos_network_manager.Swarm.md#label)
- [ownPeerId](dxos_network_manager.Swarm.md#ownpeerid)
- [topic](dxos_network_manager.Swarm.md#topic)

### Methods

- [\_closeConnection](dxos_network_manager.Swarm.md#_closeconnection)
- [\_createConnection](dxos_network_manager.Swarm.md#_createconnection)
- [\_getSwarmController](dxos_network_manager.Swarm.md#_getswarmcontroller)
- [\_initiateConnection](dxos_network_manager.Swarm.md#_initiateconnection)
- [destroy](dxos_network_manager.Swarm.md#destroy)
- [onOffer](dxos_network_manager.Swarm.md#onoffer)
- [onSignal](dxos_network_manager.Swarm.md#onsignal)
- [onSwarmEvent](dxos_network_manager.Swarm.md#onswarmevent)
- [setTopology](dxos_network_manager.Swarm.md#settopology)

## Constructors

### constructor

• **new Swarm**(`_topic`, `_ownPeerId`, `_topology`, `_protocolProvider`, `_signalMessaging`, `_transportFactory`, `_label`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_topic` | `PublicKey` |
| `_ownPeerId` | `PublicKey` |
| `_topology` | [`Topology`](../interfaces/dxos_network_manager.Topology.md) |
| `_protocolProvider` | [`ProtocolProvider`](../modules/dxos_network_manager.md#protocolprovider) |
| `_signalMessaging` | [`SignalMessaging`](../interfaces/dxos_network_manager.SignalMessaging.md) |
| `_transportFactory` | [`TransportFactory`](../modules/dxos_network_manager.md#transportfactory) |
| `_label` | `undefined` \| `string` |

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:60](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L60)

## Properties

### \_connections

• `Private` `Readonly` **\_connections**: `ComplexMap`<`PublicKey`, [`Connection`](dxos_network_manager.Connection.md)\>

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:35](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L35)

___

### \_discoveredPeers

• `Private` `Readonly` **\_discoveredPeers**: `ComplexSet`<`PublicKey`\>

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:36](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L36)

___

### connected

• `Readonly` **connected**: `Event`<`PublicKey`\>

Connection is established to a new peer.

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:55](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L55)

___

### connectionAdded

• `Readonly` **connectionAdded**: `Event`<[`Connection`](dxos_network_manager.Connection.md)\>

New connection to a peer is started.

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:45](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L45)

___

### connectionRemoved

• `Readonly` **connectionRemoved**: `Event`<[`Connection`](dxos_network_manager.Connection.md)\>

Connection to a peer is dropped.

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:50](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L50)

___

### errors

• `Readonly` **errors**: `ErrorStream`

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:57](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L57)

___

### id

• `Readonly` **id**: `PublicKey`

Unique id of the swarm, local to the current peer, generated when swarm is joined.

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:33](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L33)

## Accessors

### connections

• `get` **connections**(): [`Connection`](dxos_network_manager.Connection.md)[]

#### Returns

[`Connection`](dxos_network_manager.Connection.md)[]

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:38](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L38)

___

### label

• `get` **label**(): `undefined` \| `string`

Custom label assigned to this swarm. Used in devtools to display human-readable names for swarms.

#### Returns

`undefined` \| `string`

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:80](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L80)

___

### ownPeerId

• `get` **ownPeerId**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:73](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L73)

___

### topic

• `get` **topic**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:84](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L84)

## Methods

### \_closeConnection

▸ `Private` **_closeConnection**(`peerId`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:266](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L266)

___

### \_createConnection

▸ `Private` **_createConnection**(`initiator`, `remoteId`, `sessionId`): [`Connection`](dxos_network_manager.Connection.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `initiator` | `boolean` |
| `remoteId` | `PublicKey` |
| `sessionId` | `PublicKey` |

#### Returns

[`Connection`](dxos_network_manager.Connection.md)

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:213](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L213)

___

### \_getSwarmController

▸ `Private` **_getSwarmController**(): [`SwarmController`](../interfaces/dxos_network_manager.SwarmController.md)

#### Returns

[`SwarmController`](../interfaces/dxos_network_manager.SwarmController.md)

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:179](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L179)

___

### \_initiateConnection

▸ `Private` **_initiateConnection**(`remoteId`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `remoteId` | `PublicKey` |

#### Returns

`void`

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:198](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L198)

___

### destroy

▸ **destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:173](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L173)

___

### onOffer

▸ **onOffer**(`message`): `Promise`<`Answer`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | [`OfferMessage`](../interfaces/dxos_network_manager.OfferMessage.md) |

#### Returns

`Promise`<`Answer`\>

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:102](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L102)

___

### onSignal

▸ **onSignal**(`message`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | [`SignalMessage`](../interfaces/dxos_network_manager.SignalMessage.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:148](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L148)

___

### onSwarmEvent

▸ **onSwarmEvent**(`swarmEvent`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `swarmEvent` | `SwarmEvent` |

#### Returns

`void`

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:88](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L88)

___

### setTopology

▸ **setTopology**(`newTopology`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `newTopology` | [`Topology`](../interfaces/dxos_network_manager.Topology.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/swarm/swarm.ts:162](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/swarm/swarm.ts#L162)
