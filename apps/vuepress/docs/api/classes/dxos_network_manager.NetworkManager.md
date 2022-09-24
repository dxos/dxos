# Class: NetworkManager

[@dxos/network-manager](../modules/dxos_network_manager.md).NetworkManager

Manages connection to the swarm.

## Table of contents

### Constructors

- [constructor](dxos_network_manager.NetworkManager.md#constructor)

### Properties

- [\_connectionLog](dxos_network_manager.NetworkManager.md#_connectionlog)
- [\_ice](dxos_network_manager.NetworkManager.md#_ice)
- [\_maps](dxos_network_manager.NetworkManager.md#_maps)
- [\_messageRouter](dxos_network_manager.NetworkManager.md#_messagerouter)
- [\_messenger](dxos_network_manager.NetworkManager.md#_messenger)
- [\_signalConnection](dxos_network_manager.NetworkManager.md#_signalconnection)
- [\_signalManager](dxos_network_manager.NetworkManager.md#_signalmanager)
- [\_swarms](dxos_network_manager.NetworkManager.md#_swarms)
- [topicsUpdated](dxos_network_manager.NetworkManager.md#topicsupdated)

### Accessors

- [connectionLog](dxos_network_manager.NetworkManager.md#connectionlog)
- [signal](dxos_network_manager.NetworkManager.md#signal)
- [topics](dxos_network_manager.NetworkManager.md#topics)

### Methods

- [destroy](dxos_network_manager.NetworkManager.md#destroy)
- [getSwarm](dxos_network_manager.NetworkManager.md#getswarm)
- [getSwarmMap](dxos_network_manager.NetworkManager.md#getswarmmap)
- [joinProtocolSwarm](dxos_network_manager.NetworkManager.md#joinprotocolswarm)
- [leaveProtocolSwarm](dxos_network_manager.NetworkManager.md#leaveprotocolswarm)
- [start](dxos_network_manager.NetworkManager.md#start)

## Constructors

### constructor

• **new NetworkManager**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`NetworkManagerOptions`](../interfaces/dxos_network_manager.NetworkManagerOptions.md) |

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:51](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L51)

## Properties

### \_connectionLog

• `Private` `Optional` `Readonly` **\_connectionLog**: [`ConnectionLog`](dxos_network_manager.ConnectionLog.md)

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:47](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L47)

___

### \_ice

• `Private` `Optional` `Readonly` **\_ice**: `any`[]

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:42](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L42)

___

### \_maps

• `Private` `Readonly` **\_maps**: `ComplexMap`<`PublicKey`, [`SwarmMapper`](dxos_network_manager.SwarmMapper.md)\>

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:40](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L40)

___

### \_messageRouter

• `Private` `Readonly` **\_messageRouter**: [`MessageRouter`](dxos_network_manager.MessageRouter.md)

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:45](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L45)

___

### \_messenger

• `Private` `Readonly` **\_messenger**: `Messenger`

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:44](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L44)

___

### \_signalConnection

• `Private` `Readonly` **\_signalConnection**: [`SignalConnection`](../interfaces/dxos_network_manager.SignalConnection.md)

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:46](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L46)

___

### \_signalManager

• `Private` `Readonly` **\_signalManager**: `SignalManager`

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:43](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L43)

___

### \_swarms

• `Private` `Readonly` **\_swarms**: `ComplexMap`<`PublicKey`, [`Swarm`](dxos_network_manager.Swarm.md)\>

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:39](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L39)

___

### topicsUpdated

• `Readonly` **topicsUpdated**: `Event`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:49](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L49)

## Accessors

### connectionLog

• `get` **connectionLog**(): `undefined` \| [`ConnectionLog`](dxos_network_manager.ConnectionLog.md)

#### Returns

`undefined` \| [`ConnectionLog`](dxos_network_manager.ConnectionLog.md)

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:111](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L111)

___

### signal

• `get` **signal**(): `SignalManager`

#### Returns

`SignalManager`

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:101](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L101)

___

### topics

• `get` **topics**(): `PublicKey`[]

#### Returns

`PublicKey`[]

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:106](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L106)

## Methods

### destroy

▸ **destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:208](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L208)

___

### getSwarm

▸ **getSwarm**(`topic`): `undefined` \| [`Swarm`](dxos_network_manager.Swarm.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `PublicKey` |

#### Returns

`undefined` \| [`Swarm`](dxos_network_manager.Swarm.md)

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:119](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L119)

___

### getSwarmMap

▸ **getSwarmMap**(`topic`): `undefined` \| [`SwarmMapper`](dxos_network_manager.SwarmMapper.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `PublicKey` |

#### Returns

`undefined` \| [`SwarmMapper`](dxos_network_manager.SwarmMapper.md)

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:115](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L115)

___

### joinProtocolSwarm

▸ **joinProtocolSwarm**(`options`): () => `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`SwarmOptions`](../interfaces/dxos_network_manager.SwarmOptions.md) |

#### Returns

`fn`

▸ (): `Promise`<`void`\>

##### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:123](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L123)

___

### leaveProtocolSwarm

▸ **leaveProtocolSwarm**(`topic`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:177](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L177)

___

### start

▸ **start**(): `Promise`<`void`\>

**`Deprecated`**

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/network-manager.ts:204](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/network-manager.ts#L204)
