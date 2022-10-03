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

[packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:42](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L42)

## Properties

### \_closed

 `Private` **\_closed**: `boolean` = `false`

#### Defined in

[packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:34](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L34)

___

### \_openedRpc

 `Private` `Readonly` **\_openedRpc**: `Trigger`

#### Defined in

[packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:39](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L39)

___

### \_rpc

 `Private` `Readonly` **\_rpc**: `ProtoRpcPeer`<`Services`\>

#### Defined in

[packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:38](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L38)

___

### \_serviceStream

 `Private` **\_serviceStream**: `Stream`<`BridgeEvent`\>

#### Defined in

[packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:40](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L40)

___

### closed

 `Readonly` **closed**: `Event`<`void`\>

#### Implementation of

[Transport](../interfaces/dxos_network_manager.Transport.md).[closed](../interfaces/dxos_network_manager.Transport.md#closed)

#### Defined in

[packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:33](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L33)

___

### connected

 `Readonly` **connected**: `Event`<`void`\>

#### Implementation of

[Transport](../interfaces/dxos_network_manager.Transport.md).[connected](../interfaces/dxos_network_manager.Transport.md#connected)

#### Defined in

[packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:35](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L35)

___

### errors

 `Readonly` **errors**: `ErrorStream`

#### Implementation of

[Transport](../interfaces/dxos_network_manager.Transport.md).[errors](../interfaces/dxos_network_manager.Transport.md#errors)

#### Defined in

[packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:36](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L36)

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

[packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:75](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L75)

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

[packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:92](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L92)

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

[packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:96](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L96)

___

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[Transport](../interfaces/dxos_network_manager.Transport.md).[close](../interfaces/dxos_network_manager.Transport.md#close)

#### Defined in

[packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:111](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L111)

___

### init

**init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:57](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L57)

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

[packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts:106](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-proxy.ts#L106)
