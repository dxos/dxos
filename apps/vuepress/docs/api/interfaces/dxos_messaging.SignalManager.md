# Interface: SignalManager

[@dxos/messaging](../modules/dxos_messaging.md).SignalManager

## Hierarchy

- `SignalMethods`

  ↳ **`SignalManager`**

## Implemented by

- [`MemorySignalManager`](../classes/dxos_messaging.MemorySignalManager.md)
- [`WebsocketSignalManager`](../classes/dxos_messaging.WebsocketSignalManager.md)

## Table of contents

### Properties

- [commandTrace](dxos_messaging.SignalManager.md#commandtrace)
- [join](dxos_messaging.SignalManager.md#join)
- [leave](dxos_messaging.SignalManager.md#leave)
- [onMessage](dxos_messaging.SignalManager.md#onmessage)
- [sendMessage](dxos_messaging.SignalManager.md#sendmessage)
- [statusChanged](dxos_messaging.SignalManager.md#statuschanged)
- [subscribeMessages](dxos_messaging.SignalManager.md#subscribemessages)
- [swarmEvent](dxos_messaging.SignalManager.md#swarmevent)

### Methods

- [destroy](dxos_messaging.SignalManager.md#destroy)
- [getStatus](dxos_messaging.SignalManager.md#getstatus)

## Properties

### commandTrace

• **commandTrace**: `Event`<[`CommandTrace`](../modules/dxos_messaging.md#commandtrace)\>

#### Defined in

[packages/mesh/messaging/src/signal-manager.ts:14](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/messaging/src/signal-manager.ts#L14)

___

### join

• **join**: (`params`: { `peerId`: `PublicKey` ; `topic`: `PublicKey`  }) => `Promise`<`void`\>

#### Type declaration

▸ (`params`): `Promise`<`void`\>

Join topic on signal network, to be discoverable by other peers.

##### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.peerId` | `PublicKey` |
| `params.topic` | `PublicKey` |

##### Returns

`Promise`<`void`\>

#### Inherited from

SignalMethods.join

#### Defined in

[packages/mesh/messaging/src/signal-methods.ts:18](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/messaging/src/signal-methods.ts#L18)

___

### leave

• **leave**: (`params`: { `peerId`: `PublicKey` ; `topic`: `PublicKey`  }) => `Promise`<`void`\>

#### Type declaration

▸ (`params`): `Promise`<`void`\>

Leave topic on signal network, to stop being discoverable by other peers.

##### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.peerId` | `PublicKey` |
| `params.topic` | `PublicKey` |

##### Returns

`Promise`<`void`\>

#### Inherited from

SignalMethods.leave

#### Defined in

[packages/mesh/messaging/src/signal-methods.ts:23](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/messaging/src/signal-methods.ts#L23)

___

### onMessage

• **onMessage**: `Event`<`Message`\>

#### Defined in

[packages/mesh/messaging/src/signal-manager.ts:16](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/messaging/src/signal-manager.ts#L16)

___

### sendMessage

• **sendMessage**: (`message`: `Message`) => `Promise`<`void`\>

#### Type declaration

▸ (`message`): `Promise`<`void`\>

Send message to peer.

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Message` |

##### Returns

`Promise`<`void`\>

#### Inherited from

SignalMethods.sendMessage

#### Defined in

[packages/mesh/messaging/src/signal-methods.ts:28](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/messaging/src/signal-methods.ts#L28)

___

### statusChanged

• **statusChanged**: `Event`<[`SignalStatus`](../modules/dxos_messaging.md#signalstatus)[]\>

#### Defined in

[packages/mesh/messaging/src/signal-manager.ts:13](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/messaging/src/signal-manager.ts#L13)

___

### subscribeMessages

• **subscribeMessages**: (`peerId`: `PublicKey`) => `Promise`<`void`\>

#### Type declaration

▸ (`peerId`): `Promise`<`void`\>

Start receiving messages from

##### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `PublicKey` |

##### Returns

`Promise`<`void`\>

#### Inherited from

SignalMethods.subscribeMessages

#### Defined in

[packages/mesh/messaging/src/signal-methods.ts:33](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/messaging/src/signal-methods.ts#L33)

___

### swarmEvent

• **swarmEvent**: `Event`<{ `swarmEvent`: `SwarmEvent` ; `topic`: `PublicKey`  }\>

#### Defined in

[packages/mesh/messaging/src/signal-manager.ts:15](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/messaging/src/signal-manager.ts#L15)

## Methods

### destroy

▸ **destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/messaging/src/signal-manager.ts:19](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/messaging/src/signal-manager.ts#L19)

___

### getStatus

▸ **getStatus**(): [`SignalStatus`](../modules/dxos_messaging.md#signalstatus)[]

#### Returns

[`SignalStatus`](../modules/dxos_messaging.md#signalstatus)[]

#### Defined in

[packages/mesh/messaging/src/signal-manager.ts:18](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/messaging/src/signal-manager.ts#L18)
