# Class: Connection

[@dxos/network-manager](../modules/dxos_network_manager.md).Connection

Represents a connection to a remote peer.

## Constructors

### constructor

**new Connection**(`topic`, `ownId`, `remoteId`, `sessionId`, `initiator`, `_signalMessaging`, `_protocol`, `_transportFactory`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `PublicKey` |
| `ownId` | `PublicKey` |
| `remoteId` | `PublicKey` |
| `sessionId` | `PublicKey` |
| `initiator` | `boolean` |
| `_signalMessaging` | [`SignalMessaging`](../interfaces/dxos_network_manager.SignalMessaging.md) |
| `_protocol` | `Protocol` |
| `_transportFactory` | [`TransportFactory`](../types/dxos_network_manager.TransportFactory.md) |

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:68](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L68)

## Properties

### \_bufferedSignals

 `Private` **\_bufferedSignals**: `Signal`[] = `[]`

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:63](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L63)

___

### \_state

 `Private` **\_state**: [`ConnectionState`](../enums/dxos_network_manager.ConnectionState.md) = `ConnectionState.INITIAL`

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:61](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L61)

___

### \_transport

 `Private` **\_transport**: `undefined` \| [`Transport`](../interfaces/dxos_network_manager.Transport.md)

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:62](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L62)

___

### errors

 `Readonly` **errors**: `ErrorStream`

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:66](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L66)

___

### initiator

 `Readonly` **initiator**: `boolean`

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:73](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L73)

___

### ownId

 `Readonly` **ownId**: `PublicKey`

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:70](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L70)

___

### remoteId

 `Readonly` **remoteId**: `PublicKey`

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:71](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L71)

___

### sessionId

 `Readonly` **sessionId**: `PublicKey`

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:72](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L72)

___

### stateChanged

 `Readonly` **stateChanged**: `Event`<[`ConnectionState`](../enums/dxos_network_manager.ConnectionState.md)\>

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:65](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L65)

___

### topic

 `Readonly` **topic**: `PublicKey`

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:69](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L69)

## Accessors

### protocol

`get` **protocol**(): `Protocol`

#### Returns

`Protocol`

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:87](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L87)

___

### state

`get` **state**(): [`ConnectionState`](../enums/dxos_network_manager.ConnectionState.md)

#### Returns

[`ConnectionState`](../enums/dxos_network_manager.ConnectionState.md)

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:79](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L79)

___

### transport

`get` **transport**(): `undefined` \| [`Transport`](../interfaces/dxos_network_manager.Transport.md)

#### Returns

`undefined` \| [`Transport`](../interfaces/dxos_network_manager.Transport.md)

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:83](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L83)

## Methods

### \_changeState

`Private` **_changeState**(`state`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `state` | [`ConnectionState`](../enums/dxos_network_manager.ConnectionState.md) |

#### Returns

`void`

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:179](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L179)

___

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:184](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L184)

___

### connect

**connect**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:123](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L123)

___

### initiate

**initiate**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:91](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L91)

___

### signal

**signal**(`msg`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | [`SignalMessage`](../interfaces/dxos_network_manager.SignalMessage.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:158](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/swarm/connection.ts#L158)
