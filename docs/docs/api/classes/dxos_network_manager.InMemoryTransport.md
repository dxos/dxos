# Class: InMemoryTransport

[@dxos/network-manager](../modules/dxos_network_manager.md).InMemoryTransport

Abstraction over a P2P connection transport. Currently either WebRTC or in-memory.

## Implements

- [`Transport`](../interfaces/dxos_network_manager.Transport.md)

## Constructors

### constructor

**new InMemoryTransport**(`_ownId`, `_remoteId`, `_sessionId`, `_topic`, `_stream`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_ownId` | `PublicKey` |
| `_remoteId` | `PublicKey` |
| `_sessionId` | `PublicKey` |
| `_topic` | `PublicKey` |
| `_stream` | `ReadWriteStream` |

#### Defined in

[packages/mesh/network-manager/src/transport/in-memory-transport.ts:41](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/in-memory-transport.ts#L41)

## Properties

### \_incomingDelay

 `Private` `Readonly` **\_incomingDelay**: `ReadWriteStream`

#### Defined in

[packages/mesh/network-manager/src/transport/in-memory-transport.ts:37](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/in-memory-transport.ts#L37)

___

### \_outgoingDelay

 `Private` `Readonly` **\_outgoingDelay**: `ReadWriteStream`

#### Defined in

[packages/mesh/network-manager/src/transport/in-memory-transport.ts:36](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/in-memory-transport.ts#L36)

___

### \_ownKey

 `Private` `Readonly` **\_ownKey**: `ConnectionKey`

#### Defined in

[packages/mesh/network-manager/src/transport/in-memory-transport.ts:33](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/in-memory-transport.ts#L33)

___

### \_remoteConnection

 `Private` `Optional` **\_remoteConnection**: [`InMemoryTransport`](dxos_network_manager.InMemoryTransport.md)

#### Defined in

[packages/mesh/network-manager/src/transport/in-memory-transport.ts:39](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/in-memory-transport.ts#L39)

___

### \_remoteKey

 `Private` `Readonly` **\_remoteKey**: `ConnectionKey`

#### Defined in

[packages/mesh/network-manager/src/transport/in-memory-transport.ts:34](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/in-memory-transport.ts#L34)

___

### closed

 `Readonly` **closed**: `Event`<`void`\>

#### Implementation of

[Transport](../interfaces/dxos_network_manager.Transport.md).[closed](../interfaces/dxos_network_manager.Transport.md#closed)

#### Defined in

[packages/mesh/network-manager/src/transport/in-memory-transport.ts:29](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/in-memory-transport.ts#L29)

___

### connected

 `Readonly` **connected**: `Event`<`void`\>

#### Implementation of

[Transport](../interfaces/dxos_network_manager.Transport.md).[connected](../interfaces/dxos_network_manager.Transport.md#connected)

#### Defined in

[packages/mesh/network-manager/src/transport/in-memory-transport.ts:30](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/in-memory-transport.ts#L30)

___

### errors

 `Readonly` **errors**: `ErrorStream`

#### Implementation of

[Transport](../interfaces/dxos_network_manager.Transport.md).[errors](../interfaces/dxos_network_manager.Transport.md#errors)

#### Defined in

[packages/mesh/network-manager/src/transport/in-memory-transport.ts:31](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/in-memory-transport.ts#L31)

___

### \_connections

 `Static` `Private` `Readonly` **\_connections**: `ComplexMap`<`ConnectionKey`, [`InMemoryTransport`](dxos_network_manager.InMemoryTransport.md)\>

#### Defined in

[packages/mesh/network-manager/src/transport/in-memory-transport.ts:26](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/in-memory-transport.ts#L26)

## Accessors

### remoteId

`get` **remoteId**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/mesh/network-manager/src/transport/in-memory-transport.ts:72](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/in-memory-transport.ts#L72)

___

### sessionId

`get` **sessionId**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/mesh/network-manager/src/transport/in-memory-transport.ts:76](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/in-memory-transport.ts#L76)

## Methods

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[Transport](../interfaces/dxos_network_manager.Transport.md).[close](../interfaces/dxos_network_manager.Transport.md#close)

#### Defined in

[packages/mesh/network-manager/src/transport/in-memory-transport.ts:84](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/in-memory-transport.ts#L84)

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

[packages/mesh/network-manager/src/transport/in-memory-transport.ts:80](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/transport/in-memory-transport.ts#L80)
