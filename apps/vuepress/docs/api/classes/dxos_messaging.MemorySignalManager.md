# Class: MemorySignalManager

[@dxos/messaging](../modules/dxos_messaging.md).MemorySignalManager

In memory signal manager for testing.

## Implements

- [`SignalManager`](../interfaces/dxos_messaging.SignalManager.md)

## Table of contents

### Constructors

- [constructor](dxos_messaging.MemorySignalManager.md#constructor)

### Properties

- [commandTrace](dxos_messaging.MemorySignalManager.md#commandtrace)
- [onMessage](dxos_messaging.MemorySignalManager.md#onmessage)
- [statusChanged](dxos_messaging.MemorySignalManager.md#statuschanged)
- [swarmEvent](dxos_messaging.MemorySignalManager.md#swarmevent)

### Methods

- [destroy](dxos_messaging.MemorySignalManager.md#destroy)
- [getStatus](dxos_messaging.MemorySignalManager.md#getstatus)
- [join](dxos_messaging.MemorySignalManager.md#join)
- [leave](dxos_messaging.MemorySignalManager.md#leave)
- [sendMessage](dxos_messaging.MemorySignalManager.md#sendmessage)
- [subscribeMessages](dxos_messaging.MemorySignalManager.md#subscribemessages)

## Constructors

### constructor

• **new MemorySignalManager**(`_context`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_context` | [`MemorySignalManagerContext`](dxos_messaging.MemorySignalManagerContext.md) |

#### Defined in

[packages/mesh/messaging/src/memory-signal-manager.ts:47](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/memory-signal-manager.ts#L47)

## Properties

### commandTrace

• `Readonly` **commandTrace**: `Event`<[`CommandTrace`](../modules/dxos_messaging.md#commandtrace)\>

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[commandTrace](../interfaces/dxos_messaging.SignalManager.md#commandtrace)

#### Defined in

[packages/mesh/messaging/src/memory-signal-manager.ts:35](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/memory-signal-manager.ts#L35)

___

### onMessage

• `Readonly` **onMessage**: `Event`<{ `author`: `PublicKey` ; `payload`: `Any` ; `recipient`: `PublicKey`  }\>

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[onMessage](../interfaces/dxos_messaging.SignalManager.md#onmessage)

#### Defined in

[packages/mesh/messaging/src/memory-signal-manager.ts:41](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/memory-signal-manager.ts#L41)

___

### statusChanged

• `Readonly` **statusChanged**: `Event`<[`SignalStatus`](../modules/dxos_messaging.md#signalstatus)[]\>

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[statusChanged](../interfaces/dxos_messaging.SignalManager.md#statuschanged)

#### Defined in

[packages/mesh/messaging/src/memory-signal-manager.ts:34](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/memory-signal-manager.ts#L34)

___

### swarmEvent

• `Readonly` **swarmEvent**: `Event`<{ `swarmEvent`: `SwarmEvent` ; `topic`: `PublicKey`  }\>

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[swarmEvent](../interfaces/dxos_messaging.SignalManager.md#swarmevent)

#### Defined in

[packages/mesh/messaging/src/memory-signal-manager.ts:36](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/memory-signal-manager.ts#L36)

## Methods

### destroy

▸ **destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[destroy](../interfaces/dxos_messaging.SignalManager.md#destroy)

#### Defined in

[packages/mesh/messaging/src/memory-signal-manager.ts:117](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/memory-signal-manager.ts#L117)

___

### getStatus

▸ **getStatus**(): [`SignalStatus`](../modules/dxos_messaging.md#signalstatus)[]

#### Returns

[`SignalStatus`](../modules/dxos_messaging.md#signalstatus)[]

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[getStatus](../interfaces/dxos_messaging.SignalManager.md#getstatus)

#### Defined in

[packages/mesh/messaging/src/memory-signal-manager.ts:53](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/memory-signal-manager.ts#L53)

___

### join

▸ **join**(`__namedParameters`): `Promise`<`void`\>

Join topic on signal network, to be discoverable by other peers.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.peerId` | `PublicKey` |
| `__namedParameters.topic` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Implementation of

SignalManager.join

#### Defined in

[packages/mesh/messaging/src/memory-signal-manager.ts:57](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/memory-signal-manager.ts#L57)

___

### leave

▸ **leave**(`__namedParameters`): `Promise`<`void`\>

Leave topic on signal network, to stop being discoverable by other peers.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.peerId` | `PublicKey` |
| `__namedParameters.topic` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Implementation of

SignalManager.leave

#### Defined in

[packages/mesh/messaging/src/memory-signal-manager.ts:91](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/memory-signal-manager.ts#L91)

___

### sendMessage

▸ **sendMessage**(`__namedParameters`): `Promise`<`void`\>

Send message to peer.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.author` | `PublicKey` |
| `__namedParameters.payload` | `Any` |
| `__namedParameters.recipient` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Implementation of

SignalManager.sendMessage

#### Defined in

[packages/mesh/messaging/src/memory-signal-manager.ts:107](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/memory-signal-manager.ts#L107)

___

### subscribeMessages

▸ **subscribeMessages**(`peerId`): `Promise`<`void`\>

Start receiving messages from

#### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Implementation of

SignalManager.subscribeMessages

#### Defined in

[packages/mesh/messaging/src/memory-signal-manager.ts:115](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/memory-signal-manager.ts#L115)
