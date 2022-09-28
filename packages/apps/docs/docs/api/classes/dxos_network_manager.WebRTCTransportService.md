# Class: WebRTCTransportService

[@dxos/network-manager](../modules/dxos_network_manager.md).WebRTCTransportService

## Implements

- `BridgeService`

## Constructors

### constructor

**new WebRTCTransportService**(`_webrtcConfig?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_webrtcConfig?` | `any` |

#### Defined in

[packages/mesh/network-manager/src/transport/webrtc-transport-service.ts:16](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-service.ts#L16)

## Properties

### peers

 `Protected` **peers**: `Map`<`number`, `Instance`\>

#### Defined in

[packages/mesh/network-manager/src/transport/webrtc-transport-service.ts:14](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-service.ts#L14)

## Methods

### close

**close**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `CloseRequest` |

#### Returns

`Promise`<`void`\>

#### Implementation of

BridgeService.close

#### Defined in

[packages/mesh/network-manager/src/transport/webrtc-transport-service.ts:97](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-service.ts#L97)

___

### open

**open**(`request`): `Stream`<`BridgeEvent`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | `ConnectionRequest` |

#### Returns

`Stream`<`BridgeEvent`\>

#### Implementation of

BridgeService.open

#### Defined in

[packages/mesh/network-manager/src/transport/webrtc-transport-service.ts:21](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-service.ts#L21)

___

### sendData

**sendData**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `DataRequest` |

#### Returns

`Promise`<`void`\>

#### Implementation of

BridgeService.sendData

#### Defined in

[packages/mesh/network-manager/src/transport/webrtc-transport-service.ts:92](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-service.ts#L92)

___

### sendSignal

**sendSignal**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `SignalRequest` |

#### Returns

`Promise`<`void`\>

#### Implementation of

BridgeService.sendSignal

#### Defined in

[packages/mesh/network-manager/src/transport/webrtc-transport-service.ts:86](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/webrtc-transport-service.ts#L86)
