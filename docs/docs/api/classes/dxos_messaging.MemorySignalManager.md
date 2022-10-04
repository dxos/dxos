# Class: MemorySignalManager

[@dxos/messaging](../modules/dxos_messaging.md).MemorySignalManager

In memory signal manager for testing.

## Implements

- [`SignalManager`](../interfaces/dxos_messaging.SignalManager.md)

## Constructors

### constructor

**new MemorySignalManager**(`_context`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_context` | [`MemorySignalManagerContext`](dxos_messaging.MemorySignalManagerContext.md) |

#### Defined in

[packages/core/mesh/messaging/src/memory-signal-manager.ts:47](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/memory-signal-manager.ts#L47)

## Properties

### commandTrace

 `Readonly` **commandTrace**: `Event`<[`CommandTrace`](../types/dxos_messaging.CommandTrace.md)\>

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[commandTrace](../interfaces/dxos_messaging.SignalManager.md#commandtrace)

#### Defined in

[packages/core/mesh/messaging/src/memory-signal-manager.ts:35](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/memory-signal-manager.ts#L35)

___

### onMessage

 `Readonly` **onMessage**: `Event`<{ `author`: `PublicKey` ; `payload`: `Any` ; `recipient`: `PublicKey`  }\>

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[onMessage](../interfaces/dxos_messaging.SignalManager.md#onmessage)

#### Defined in

[packages/core/mesh/messaging/src/memory-signal-manager.ts:41](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/memory-signal-manager.ts#L41)

___

### statusChanged

 `Readonly` **statusChanged**: `Event`<[`SignalStatus`](../types/dxos_messaging.SignalStatus.md)[]\>

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[statusChanged](../interfaces/dxos_messaging.SignalManager.md#statuschanged)

#### Defined in

[packages/core/mesh/messaging/src/memory-signal-manager.ts:34](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/memory-signal-manager.ts#L34)

___

### swarmEvent

 `Readonly` **swarmEvent**: `Event`<{ `swarmEvent`: `SwarmEvent` ; `topic`: `PublicKey`  }\>

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[swarmEvent](../interfaces/dxos_messaging.SignalManager.md#swarmevent)

#### Defined in

[packages/core/mesh/messaging/src/memory-signal-manager.ts:36](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/memory-signal-manager.ts#L36)

## Methods

### destroy

**destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[destroy](../interfaces/dxos_messaging.SignalManager.md#destroy)

#### Defined in

[packages/core/mesh/messaging/src/memory-signal-manager.ts:118](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/memory-signal-manager.ts#L118)

___

### getStatus

**getStatus**(): [`SignalStatus`](../types/dxos_messaging.SignalStatus.md)[]

#### Returns

[`SignalStatus`](../types/dxos_messaging.SignalStatus.md)[]

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[getStatus](../interfaces/dxos_messaging.SignalManager.md#getstatus)

#### Defined in

[packages/core/mesh/messaging/src/memory-signal-manager.ts:53](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/memory-signal-manager.ts#L53)

___

### join

**join**(`__namedParameters`): `Promise`<`void`\>

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

[packages/core/mesh/messaging/src/memory-signal-manager.ts:57](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/memory-signal-manager.ts#L57)

___

### leave

**leave**(`__namedParameters`): `Promise`<`void`\>

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

[packages/core/mesh/messaging/src/memory-signal-manager.ts:91](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/memory-signal-manager.ts#L91)

___

### sendMessage

**sendMessage**(`__namedParameters`): `Promise`<`void`\>

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

[packages/core/mesh/messaging/src/memory-signal-manager.ts:107](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/memory-signal-manager.ts#L107)

___

### subscribeMessages

**subscribeMessages**(`peerId`): `Promise`<`void`\>

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

[packages/core/mesh/messaging/src/memory-signal-manager.ts:116](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/memory-signal-manager.ts#L116)
