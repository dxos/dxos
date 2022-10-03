# Class: WebRTCTransportProxy

[@dxos/network-manager](../modules/dxos_network_manager.md).WebRTCTransportProxy

Abstraction over a P2P connection transport. Currently either WebRTC or in-memory.

## Implements

- [`Transport`](../interfaces/dxos_network_manager.Transport.md)

## Constructors

### constructor

**new WebRTCTransportProxy**(`_params`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_params` | [`WebRTCTransportProxyParams`](../interfaces/dxos_network_manager.WebRTCTransportProxyParams.md) |

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:43](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L43)

## Properties

### \_closed

 `Private` **\_closed**: `boolean` = `false`

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:35](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L35)

___

### \_openedRpc

 `Private` `Readonly` **\_openedRpc**: `Trigger`

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:40](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L40)

___

### \_rpc

 `Private` `Readonly` **\_rpc**: `ProtoRpcPeer`<`Services`\>

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:39](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L39)

___

### \_serviceStream

 `Private` **\_serviceStream**: `Stream`<`BridgeEvent`\>

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:41](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L41)

___

### closed

 `Readonly` **closed**: `Event`<`void`\>

#### Implementation of

[Transport](../interfaces/dxos_network_manager.Transport.md).[closed](../interfaces/dxos_network_manager.Transport.md#closed)

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:34](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L34)

___

### connected

 `Readonly` **connected**: `Event`<`void`\>

#### Implementation of

[Transport](../interfaces/dxos_network_manager.Transport.md).[connected](../interfaces/dxos_network_manager.Transport.md#connected)

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:36](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L36)

___

### errors

 `Readonly` **errors**: `ErrorStream`

#### Implementation of

[Transport](../interfaces/dxos_network_manager.Transport.md).[errors](../interfaces/dxos_network_manager.Transport.md#errors)

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:37](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L37)

## Methods

### \_handleConnection

`Private` **_handleConnection**(`connectionEvent`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `connectionEvent` | `ConnectionEvent` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:76](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L76)

___

### \_handleData

`Private` **_handleData**(`dataEvent`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `dataEvent` | `DataEvent` |

#### Returns

`void`

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:93](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L93)

___

### \_handleSignal

`Private` **_handleSignal**(`signalEvent`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `signalEvent` | `SignalEvent` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:97](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L97)

___

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[Transport](../interfaces/dxos_network_manager.Transport.md).[close](../interfaces/dxos_network_manager.Transport.md#close)

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:112](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L112)

___

### init

**init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:58](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L58)

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

[packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:107](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L107)
