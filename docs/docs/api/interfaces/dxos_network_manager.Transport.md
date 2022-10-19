# Interface: Transport

[@dxos/network-manager](../modules/dxos_network_manager.md).Transport

Abstraction over a P2P connection transport. Currently either WebRTC or in-memory.

## Implemented by

- [`MemoryTransport`](../classes/dxos_network_manager.MemoryTransport.md)
- [`WebRTCTransport`](../classes/dxos_network_manager.WebRTCTransport.md)
- [`WebRTCTransportProxy`](../classes/dxos_network_manager.WebRTCTransportProxy.md)

## Properties

### closed

 **closed**: `Event`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/transport/transport.ts:16](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/transport.ts#L16)

___

### connected

 **connected**: `Event`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/transport/transport.ts:17](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/transport.ts#L17)

___

### errors

 **errors**: `ErrorStream`

#### Defined in

[packages/core/mesh/network-manager/src/transport/transport.ts:18](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/transport.ts#L18)

## Methods

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/transport/transport.ts:20](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/transport.ts#L20)

___

### signal

**signal**(`signal`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `signal` | `Signal` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/transport/transport.ts:19](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/transport/transport.ts#L19)
