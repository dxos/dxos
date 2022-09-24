# Interface: Transport

[@dxos/network-manager](../modules/dxos_network_manager.md).Transport

Abstraction over a P2P connection transport. Currently either WebRTC or in-memory.

## Implemented by

- [`InMemoryTransport`](../classes/dxos_network_manager.InMemoryTransport.md)
- [`WebRTCTransport`](../classes/dxos_network_manager.WebRTCTransport.md)

## Table of contents

### Properties

- [closed](dxos_network_manager.Transport.md#closed)
- [connected](dxos_network_manager.Transport.md#connected)
- [errors](dxos_network_manager.Transport.md#errors)

### Methods

- [close](dxos_network_manager.Transport.md#close)
- [signal](dxos_network_manager.Transport.md#signal)

## Properties

### closed

• **closed**: `Event`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/transport/transport.ts:16](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/transport/transport.ts#L16)

___

### connected

• **connected**: `Event`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/transport/transport.ts:17](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/transport/transport.ts#L17)

___

### errors

• **errors**: `ErrorStream`

#### Defined in

[packages/mesh/network-manager/src/transport/transport.ts:18](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/transport/transport.ts#L18)

## Methods

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/transport/transport.ts:20](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/transport/transport.ts#L20)

___

### signal

▸ **signal**(`signal`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `signal` | `Signal` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/transport/transport.ts:19](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/network-manager/src/transport/transport.ts#L19)
