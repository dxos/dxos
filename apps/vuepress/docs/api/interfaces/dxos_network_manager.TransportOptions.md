# Interface: TransportOptions

[@dxos/network-manager](../modules/dxos_network_manager.md).TransportOptions

## Table of contents

### Properties

- [initiator](dxos_network_manager.TransportOptions.md#initiator)
- [ownId](dxos_network_manager.TransportOptions.md#ownid)
- [remoteId](dxos_network_manager.TransportOptions.md#remoteid)
- [sendSignal](dxos_network_manager.TransportOptions.md#sendsignal)
- [sessionId](dxos_network_manager.TransportOptions.md#sessionid)
- [stream](dxos_network_manager.TransportOptions.md#stream)
- [topic](dxos_network_manager.TransportOptions.md#topic)

## Properties

### initiator

• **initiator**: `boolean`

Did local node initiate this connection.

#### Defined in

[packages/mesh/network-manager/src/transport/transport.ts:27](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/transport/transport.ts#L27)

___

### ownId

• **ownId**: `PublicKey`

#### Defined in

[packages/mesh/network-manager/src/transport/transport.ts:29](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/transport/transport.ts#L29)

___

### remoteId

• **remoteId**: `PublicKey`

#### Defined in

[packages/mesh/network-manager/src/transport/transport.ts:30](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/transport/transport.ts#L30)

___

### sendSignal

• **sendSignal**: (`msg`: [`SignalMessage`](dxos_network_manager.SignalMessage.md)) => `Promise`<`void`\>

#### Type declaration

▸ (`msg`): `Promise`<`void`\>

Send a signal message to remote peer.

##### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | [`SignalMessage`](dxos_network_manager.SignalMessage.md) |

##### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/transport/transport.ts:42](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/transport/transport.ts#L42)

___

### sessionId

• **sessionId**: `PublicKey`

#### Defined in

[packages/mesh/network-manager/src/transport/transport.ts:31](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/transport/transport.ts#L31)

___

### stream

• **stream**: `ReadWriteStream`

Wire protocol.

#### Defined in

[packages/mesh/network-manager/src/transport/transport.ts:37](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/transport/transport.ts#L37)

___

### topic

• **topic**: `PublicKey`

#### Defined in

[packages/mesh/network-manager/src/transport/transport.ts:32](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/network-manager/src/transport/transport.ts#L32)
