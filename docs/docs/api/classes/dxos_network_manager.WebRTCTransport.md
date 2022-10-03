# Class: WebRTCTransport

[@dxos/network-manager](../modules/dxos_network_manager.md).WebRTCTransport

Implements Transport for WebRTC. Uses simple-peer under the hood.

## Implements

- [`Transport`](../interfaces/dxos_network_manager.Transport.md)

## Constructors

### constructor

**new WebRTCTransport**(`_initiator`, `_stream`, `_ownId`, `_remoteId`, `_sessionId`, `_topic`, `_sendSignal`, `_webrtcConfig?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_initiator` | `boolean` |
| `_stream` | `ReadWriteStream` |
| `_ownId` | `PublicKey` |
| `_remoteId` | `PublicKey` |
| `_sessionId` | `PublicKey` |
| `_topic` | `PublicKey` |
| `_sendSignal` | (`msg`: [`SignalMessage`](../interfaces/dxos_network_manager.SignalMessage.md)) => `void` |
| `_webrtcConfig?` | `any` |

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport.ts:28](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport.ts#L28)

## Properties

### \_peer

 `Private` `Readonly` **\_peer**: `Instance`

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport.ts:22](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport.ts#L22)

___

### closed

 `Readonly` **closed**: `Event`<`void`\>

#### Implementation of

[Transport](../interfaces/dxos_network_manager.Transport.md).[closed](../interfaces/dxos_network_manager.Transport.md#closed)

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport.ts:24](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport.ts#L24)

___

### connected

 `Readonly` **connected**: `Event`<`void`\>

#### Implementation of

[Transport](../interfaces/dxos_network_manager.Transport.md).[connected](../interfaces/dxos_network_manager.Transport.md#connected)

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport.ts:25](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport.ts#L25)

___

### errors

 `Readonly` **errors**: `ErrorStream`

#### Implementation of

[Transport](../interfaces/dxos_network_manager.Transport.md).[errors](../interfaces/dxos_network_manager.Transport.md#errors)

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport.ts:26](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport.ts#L26)

## Accessors

### peer

`get` **peer**(): `Instance`

#### Returns

`Instance`

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport.ts:83](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport.ts#L83)

___

### remoteId

`get` **remoteId**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport.ts:75](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport.ts#L75)

___

### sessionId

`get` **sessionId**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport.ts:79](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport.ts#L79)

## Methods

### \_disconnectStreams

`Private` **_disconnectStreams**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport.ts:99](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport.ts#L99)

___

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[Transport](../interfaces/dxos_network_manager.Transport.md).[close](../interfaces/dxos_network_manager.Transport.md#close)

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport.ts:93](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport.ts#L93)

___

### signal

**signal**(`signal`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `signal` | `Signal` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[Transport](../interfaces/dxos_network_manager.Transport.md).[signal](../interfaces/dxos_network_manager.Transport.md#signal)

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport.ts:87](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport.ts#L87)
