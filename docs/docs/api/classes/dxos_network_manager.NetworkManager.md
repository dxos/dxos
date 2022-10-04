# Class: NetworkManager

[@dxos/network-manager](../modules/dxos_network_manager.md).NetworkManager

Manages connection to the swarm.

## Constructors

### constructor

**new NetworkManager**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`NetworkManagerOptions`](../interfaces/dxos_network_manager.NetworkManagerOptions.md) |

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:50](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L50)

## Properties

### \_connectionLog

 `Private` `Optional` `Readonly` **\_connectionLog**: [`ConnectionLog`](dxos_network_manager.ConnectionLog.md)

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:46](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L46)

___

### \_ice

 `Private` `Optional` `Readonly` **\_ice**: `any`[]

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:41](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L41)

___

### \_maps

 `Private` `Readonly` **\_maps**: `ComplexMap`<`PublicKey`, [`SwarmMapper`](dxos_network_manager.SwarmMapper.md)\>

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:39](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L39)

___

### \_messageRouter

 `Private` `Readonly` **\_messageRouter**: [`MessageRouter`](dxos_network_manager.MessageRouter.md)

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:44](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L44)

___

### \_messenger

 `Private` `Readonly` **\_messenger**: `Messenger`

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:43](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L43)

___

### \_signalConnection

 `Private` `Readonly` **\_signalConnection**: [`SignalConnection`](../interfaces/dxos_network_manager.SignalConnection.md)

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:45](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L45)

___

### \_signalManager

 `Private` `Readonly` **\_signalManager**: `SignalManager`

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:42](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L42)

___

### \_swarms

 `Private` `Readonly` **\_swarms**: `ComplexMap`<`PublicKey`, [`Swarm`](dxos_network_manager.Swarm.md)\>

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:38](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L38)

___

### topicsUpdated

 `Readonly` **topicsUpdated**: `Event`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:48](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L48)

## Accessors

### connectionLog

`get` **connectionLog**(): `undefined` \| [`ConnectionLog`](dxos_network_manager.ConnectionLog.md)

#### Returns

`undefined` \| [`ConnectionLog`](dxos_network_manager.ConnectionLog.md)

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:110](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L110)

___

### signal

`get` **signal**(): `SignalManager`

#### Returns

`SignalManager`

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:100](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L100)

___

### topics

`get` **topics**(): `PublicKey`[]

#### Returns

`PublicKey`[]

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:105](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L105)

## Methods

### destroy

**destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:201](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L201)

___

### getSwarm

**getSwarm**(`topic`): `undefined` \| [`Swarm`](dxos_network_manager.Swarm.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `PublicKey` |

#### Returns

`undefined` \| [`Swarm`](dxos_network_manager.Swarm.md)

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:118](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L118)

___

### getSwarmMap

**getSwarmMap**(`topic`): `undefined` \| [`SwarmMapper`](dxos_network_manager.SwarmMapper.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `PublicKey` |

#### Returns

`undefined` \| [`SwarmMapper`](dxos_network_manager.SwarmMapper.md)

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:114](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L114)

___

### joinProtocolSwarm

**joinProtocolSwarm**(`options`): () => `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`SwarmOptions`](../interfaces/dxos_network_manager.SwarmOptions.md) |

#### Returns

`fn`

(): `Promise`<`void`\>

##### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:122](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L122)

___

### leaveProtocolSwarm

**leaveProtocolSwarm**(`topic`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:170](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L170)

___

### start

**start**(): `Promise`<`void`\>

**`Deprecated`**

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/network-manager.ts:197](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/network-manager.ts#L197)
