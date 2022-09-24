# Class: NetworkManager

[@dxos/client](../modules/dxos_client.md).NetworkManager

Manages connection to the swarm.

## Table of contents

### Constructors

- [constructor](dxos_client.NetworkManager.md#constructor)

### Properties

- [\_connectionLog](dxos_client.NetworkManager.md#_connectionlog)
- [\_ice](dxos_client.NetworkManager.md#_ice)
- [\_maps](dxos_client.NetworkManager.md#_maps)
- [\_messageRouter](dxos_client.NetworkManager.md#_messagerouter)
- [\_messenger](dxos_client.NetworkManager.md#_messenger)
- [\_signalConnection](dxos_client.NetworkManager.md#_signalconnection)
- [\_signalManager](dxos_client.NetworkManager.md#_signalmanager)
- [\_swarms](dxos_client.NetworkManager.md#_swarms)
- [topicsUpdated](dxos_client.NetworkManager.md#topicsupdated)

### Accessors

- [connectionLog](dxos_client.NetworkManager.md#connectionlog)
- [signal](dxos_client.NetworkManager.md#signal)
- [topics](dxos_client.NetworkManager.md#topics)

### Methods

- [destroy](dxos_client.NetworkManager.md#destroy)
- [getSwarm](dxos_client.NetworkManager.md#getswarm)
- [getSwarmMap](dxos_client.NetworkManager.md#getswarmmap)
- [joinProtocolSwarm](dxos_client.NetworkManager.md#joinprotocolswarm)
- [leaveProtocolSwarm](dxos_client.NetworkManager.md#leaveprotocolswarm)
- [start](dxos_client.NetworkManager.md#start)

## Constructors

### constructor

• **new NetworkManager**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `NetworkManagerOptions` |

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:34

## Properties

### \_connectionLog

• `Private` `Optional` `Readonly` **\_connectionLog**: `any`

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:32

___

### \_ice

• `Private` `Optional` `Readonly` **\_ice**: `any`

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:27

___

### \_maps

• `Private` `Readonly` **\_maps**: `any`

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:26

___

### \_messageRouter

• `Private` `Readonly` **\_messageRouter**: `any`

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:30

___

### \_messenger

• `Private` `Readonly` **\_messenger**: `any`

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:29

___

### \_signalConnection

• `Private` `Readonly` **\_signalConnection**: `any`

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:31

___

### \_signalManager

• `Private` `Readonly` **\_signalManager**: `any`

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:28

___

### \_swarms

• `Private` `Readonly` **\_swarms**: `any`

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:25

___

### topicsUpdated

• `Readonly` **topicsUpdated**: `Event`<`void`\>

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:33

## Accessors

### connectionLog

• `get` **connectionLog**(): `undefined` \| `ConnectionLog`

#### Returns

`undefined` \| `ConnectionLog`

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:37

___

### signal

• `get` **signal**(): `SignalManager`

#### Returns

`SignalManager`

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:35

___

### topics

• `get` **topics**(): `PublicKey`[]

#### Returns

`PublicKey`[]

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:36

## Methods

### destroy

▸ **destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:46

___

### getSwarm

▸ **getSwarm**(`topic`): `undefined` \| `Swarm`

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `PublicKey` |

#### Returns

`undefined` \| `Swarm`

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:39

___

### getSwarmMap

▸ **getSwarmMap**(`topic`): `undefined` \| `SwarmMapper`

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `PublicKey` |

#### Returns

`undefined` \| `SwarmMapper`

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:38

___

### joinProtocolSwarm

▸ **joinProtocolSwarm**(`options`): () => `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `SwarmOptions` |

#### Returns

`fn`

▸ (): `Promise`<`void`\>

##### Returns

`Promise`<`void`\>

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:40

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

packages/mesh/network-manager/dist/src/network-manager.d.ts:41

___

### start

▸ **start**(): `Promise`<`void`\>

**`Deprecated`**

#### Returns

`Promise`<`void`\>

#### Defined in

packages/mesh/network-manager/dist/src/network-manager.d.ts:45
