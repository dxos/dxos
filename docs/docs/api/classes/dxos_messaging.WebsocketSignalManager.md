# Class: WebsocketSignalManager

[@dxos/messaging](../modules/dxos_messaging.md).WebsocketSignalManager

## Implements

- [`SignalManager`](../interfaces/dxos_messaging.SignalManager.md)

## Constructors

### constructor

**new WebsocketSignalManager**(`_hosts`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_hosts` | `string`[] |

#### Defined in

[packages/mesh/messaging/src/websocket-signal-manager.ts:46](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L46)

## Properties

### \_destroyed

 `Private` **\_destroyed**: `boolean` = `false`

#### Defined in

[packages/mesh/messaging/src/websocket-signal-manager.ts:31](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L31)

___

### \_reconcileTimeoutId

 `Private` `Optional` **\_reconcileTimeoutId**: `Timeout`

#### Defined in

[packages/mesh/messaging/src/websocket-signal-manager.ts:30](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L30)

___

### \_reconciling

 `Private` `Optional` **\_reconciling**: `boolean` = `false`

#### Defined in

[packages/mesh/messaging/src/websocket-signal-manager.ts:29](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L29)

___

### \_servers

 `Private` `Readonly` **\_servers**: `Map`<`string`, [`SignalClient`](dxos_messaging.SignalClient.md)\>

#### Defined in

[packages/mesh/messaging/src/websocket-signal-manager.ts:19](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L19)

___

### \_topicsJoined

 `Private` `Readonly` **\_topicsJoined**: `ComplexMap`<`PublicKey`, `PublicKey`\>

Topics joined: topic => peerId

#### Defined in

[packages/mesh/messaging/src/websocket-signal-manager.ts:22](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L22)

___

### \_topicsJoinedPerSignal

 `Private` `Readonly` **\_topicsJoinedPerSignal**: `Map`<`string`, `ComplexMap`<`PublicKey`, `PublicKey`\>\>

host => topic => peerId

#### Defined in

[packages/mesh/messaging/src/websocket-signal-manager.ts:27](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L27)

___

### commandTrace

 `Readonly` **commandTrace**: `Event`<[`CommandTrace`](../types/dxos_messaging.CommandTrace.md)\>

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[commandTrace](../interfaces/dxos_messaging.SignalManager.md#commandtrace)

#### Defined in

[packages/mesh/messaging/src/websocket-signal-manager.ts:34](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L34)

___

### onMessage

 `Readonly` **onMessage**: `Event`<{ `author`: `PublicKey` ; `payload`: `Any` ; `recipient`: `PublicKey`  }\>

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[onMessage](../interfaces/dxos_messaging.SignalManager.md#onmessage)

#### Defined in

[packages/mesh/messaging/src/websocket-signal-manager.ts:40](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L40)

___

### statusChanged

 `Readonly` **statusChanged**: `Event`<[`SignalStatus`](../types/dxos_messaging.SignalStatus.md)[]\>

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[statusChanged](../interfaces/dxos_messaging.SignalManager.md#statuschanged)

#### Defined in

[packages/mesh/messaging/src/websocket-signal-manager.ts:33](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L33)

___

### swarmEvent

 `Readonly` **swarmEvent**: `Event`<{ `swarmEvent`: `SwarmEvent` ; `topic`: `PublicKey`  }\>

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[swarmEvent](../interfaces/dxos_messaging.SignalManager.md#swarmevent)

#### Defined in

[packages/mesh/messaging/src/websocket-signal-manager.ts:35](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L35)

## Methods

### \_reconcileJoinedTopics

`Private` **_reconcileJoinedTopics**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/messaging/src/websocket-signal-manager.ts:123](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L123)

___

### \_reconcileLater

`Private` **_reconcileLater**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/messaging/src/websocket-signal-manager.ts:110](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L110)

___

### \_scheduleReconcile

`Private` **_scheduleReconcile**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/messaging/src/websocket-signal-manager.ts:88](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L88)

___

### destroy

**destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[destroy](../interfaces/dxos_messaging.SignalManager.md#destroy)

#### Defined in

[packages/mesh/messaging/src/websocket-signal-manager.ts:199](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L199)

___

### getStatus

**getStatus**(): [`SignalStatus`](../types/dxos_messaging.SignalStatus.md)[]

#### Returns

[`SignalStatus`](../types/dxos_messaging.SignalStatus.md)[]

#### Implementation of

[SignalManager](../interfaces/dxos_messaging.SignalManager.md).[getStatus](../interfaces/dxos_messaging.SignalManager.md#getstatus)

#### Defined in

[packages/mesh/messaging/src/websocket-signal-manager.ts:68](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L68)

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

[packages/mesh/messaging/src/websocket-signal-manager.ts:74](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L74)

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

[packages/mesh/messaging/src/websocket-signal-manager.ts:81](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L81)

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

[packages/mesh/messaging/src/websocket-signal-manager.ts:171](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L171)

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

[packages/mesh/messaging/src/websocket-signal-manager.ts:190](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/websocket-signal-manager.ts#L190)
