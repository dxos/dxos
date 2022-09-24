# Class: SignalClient

[@dxos/messaging](../modules/dxos_messaging.md).SignalClient

Establishes a websocket connection to signal server and provides RPC methods.

## Implements

- `SignalMethods`

## Table of contents

### Constructors

- [constructor](dxos_messaging.SignalClient.md#constructor)

### Properties

- [\_cleanupSubscriptions](dxos_messaging.SignalClient.md#_cleanupsubscriptions)
- [\_client](dxos_messaging.SignalClient.md#_client)
- [\_connectionStarted](dxos_messaging.SignalClient.md#_connectionstarted)
- [\_lastError](dxos_messaging.SignalClient.md#_lasterror)
- [\_lastStateChange](dxos_messaging.SignalClient.md#_laststatechange)
- [\_messageStreams](dxos_messaging.SignalClient.md#_messagestreams)
- [\_reconnectAfter](dxos_messaging.SignalClient.md#_reconnectafter)
- [\_reconnectIntervalId](dxos_messaging.SignalClient.md#_reconnectintervalid)
- [\_state](dxos_messaging.SignalClient.md#_state)
- [\_swarmStreams](dxos_messaging.SignalClient.md#_swarmstreams)
- [commandTrace](dxos_messaging.SignalClient.md#commandtrace)
- [statusChanged](dxos_messaging.SignalClient.md#statuschanged)
- [swarmEvent](dxos_messaging.SignalClient.md#swarmevent)

### Methods

- [\_createClient](dxos_messaging.SignalClient.md#_createclient)
- [\_reconnect](dxos_messaging.SignalClient.md#_reconnect)
- [\_setState](dxos_messaging.SignalClient.md#_setstate)
- [\_subscribeSwarmEvents](dxos_messaging.SignalClient.md#_subscribeswarmevents)
- [close](dxos_messaging.SignalClient.md#close)
- [getStatus](dxos_messaging.SignalClient.md#getstatus)
- [join](dxos_messaging.SignalClient.md#join)
- [leave](dxos_messaging.SignalClient.md#leave)
- [sendMessage](dxos_messaging.SignalClient.md#sendmessage)
- [subscribeMessages](dxos_messaging.SignalClient.md#subscribemessages)

## Constructors

### constructor

• **new SignalClient**(`_host`, `_onMessage`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_host` | `string` | Signal server websocket URL. |
| `_onMessage` | (`__namedParameters`: { `author`: `PublicKey` ; `payload`: `Any` ; `recipient`: `PublicKey`  }) => `Promise`<`void`\> | - |

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:104](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L104)

## Properties

### \_cleanupSubscriptions

• `Private` **\_cleanupSubscriptions**: `SubscriptionGroup`

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:83](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L83)

___

### \_client

• `Private` **\_client**: `SignalRPCClient`

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:81](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L81)

___

### \_connectionStarted

• `Private` **\_connectionStarted**: `number`

Timestamp of when the connection attempt was began.

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:72](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L72)

___

### \_lastError

• `Private` `Optional` **\_lastError**: `Error`

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:62](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L62)

___

### \_lastStateChange

• `Private` **\_lastStateChange**: `number`

Timestamp of last state change.

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:77](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L77)

___

### \_messageStreams

• `Private` `Readonly` **\_messageStreams**: `ComplexMap`<`PublicKey`, `Stream`<`Message`\>\>

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:97](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L97)

___

### \_reconnectAfter

• `Private` **\_reconnectAfter**: `number` = `DEFAULT_RECONNECT_TIMEOUT`

Number of milliseconds after which the connection will be attempted again in case of error.

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:67](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L67)

___

### \_reconnectIntervalId

• `Private` `Optional` **\_reconnectIntervalId**: `Timeout`

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:79](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L79)

___

### \_state

• `Private` **\_state**: [`SignalState`](../enums/dxos_messaging.SignalState.md) = `SignalState.CONNECTING`

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:60](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L60)

___

### \_swarmStreams

• `Private` `Readonly` **\_swarmStreams**: `ComplexMap`<`PublicKey`, `Stream`<`SwarmEvent`\>\>

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:92](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L92)

___

### commandTrace

• `Readonly` **commandTrace**: `Event`<[`CommandTrace`](../modules/dxos_messaging.md#commandtrace)\>

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:86](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L86)

___

### statusChanged

• `Readonly` **statusChanged**: `Event`<[`SignalStatus`](../modules/dxos_messaging.md#signalstatus)\>

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:84](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L84)

___

### swarmEvent

• `Readonly` **swarmEvent**: `Event`<{ `swarmEvent`: `SwarmEvent` ; `topic`: `PublicKey`  }\>

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:87](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L87)

## Methods

### \_createClient

▸ `Private` **_createClient**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:127](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L127)

___

### \_reconnect

▸ `Private` **_reconnect**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:188](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L188)

___

### \_setState

▸ `Private` **_setState**(`newState`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `newState` | [`SignalState`](../enums/dxos_messaging.SignalState.md) |

#### Returns

`void`

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:120](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L120)

___

### \_subscribeSwarmEvents

▸ `Private` **_subscribeSwarmEvents**(`topic`, `peerId`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `PublicKey` |
| `peerId` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:266](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L266)

___

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:211](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L211)

___

### getStatus

▸ **getStatus**(): [`SignalStatus`](../modules/dxos_messaging.md#signalstatus)

#### Returns

[`SignalStatus`](../modules/dxos_messaging.md#signalstatus)

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:223](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L223)

___

### join

▸ **join**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.peerId` | `PublicKey` |
| `__namedParameters.topic` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Implementation of

SignalMethods.join

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:234](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L234)

___

### leave

▸ **leave**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.peerId` | `PublicKey` |
| `__namedParameters.topic` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Implementation of

SignalMethods.leave

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:246](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L246)

___

### sendMessage

▸ **sendMessage**(`msg`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `Message` |

#### Returns

`Promise`<`void`\>

#### Implementation of

SignalMethods.sendMessage

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:262](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L262)

___

### subscribeMessages

▸ **subscribeMessages**(`peerId`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Implementation of

SignalMethods.subscribeMessages

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:291](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L291)
