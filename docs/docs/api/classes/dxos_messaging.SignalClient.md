# Class: SignalClient

[@dxos/messaging](../modules/dxos_messaging.md).SignalClient

Establishes a websocket connection to signal server and provides RPC methods.

## Implements

- `SignalMethods`

## Constructors

### constructor

**new SignalClient**(`_host`, `_onMessage`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_host` | `string` | Signal server websocket URL. |
| `_onMessage` | (`__namedParameters`: { `author`: `PublicKey` ; `payload`: `Any` ; `recipient`: `PublicKey`  }) => `Promise`<`void`\> | - |

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:104](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L104)

## Properties

### \_cleanupSubscriptions

 `Private` **\_cleanupSubscriptions**: `SubscriptionGroup`

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:83](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L83)

___

### \_client

 `Private` **\_client**: `SignalRPCClient`

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:81](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L81)

___

### \_connectionStarted

 `Private` **\_connectionStarted**: `number`

Timestamp of when the connection attempt was began.

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:72](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L72)

___

### \_lastError

 `Private` `Optional` **\_lastError**: `Error`

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:62](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L62)

___

### \_lastStateChange

 `Private` **\_lastStateChange**: `number`

Timestamp of last state change.

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:77](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L77)

___

### \_messageStreams

 `Private` `Readonly` **\_messageStreams**: `ComplexMap`<`PublicKey`, `Stream`<`Message`\>\>

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:97](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L97)

___

### \_reconnectAfter

 `Private` **\_reconnectAfter**: `number` = `DEFAULT_RECONNECT_TIMEOUT`

Number of milliseconds after which the connection will be attempted again in case of error.

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:67](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L67)

___

### \_reconnectIntervalId

 `Private` `Optional` **\_reconnectIntervalId**: `Timeout`

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:79](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L79)

___

### \_state

 `Private` **\_state**: [`SignalState`](../enums/dxos_messaging.SignalState.md) = `SignalState.CONNECTING`

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:60](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L60)

___

### \_swarmStreams

 `Private` `Readonly` **\_swarmStreams**: `ComplexMap`<`PublicKey`, `Stream`<`SwarmEvent`\>\>

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:92](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L92)

___

### commandTrace

 `Readonly` **commandTrace**: `Event`<[`CommandTrace`](../types/dxos_messaging.CommandTrace.md)\>

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:86](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L86)

___

### statusChanged

 `Readonly` **statusChanged**: `Event`<[`SignalStatus`](../types/dxos_messaging.SignalStatus.md)\>

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:84](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L84)

___

### swarmEvent

 `Readonly` **swarmEvent**: `Event`<{ `swarmEvent`: `SwarmEvent` ; `topic`: `PublicKey`  }\>

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:87](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L87)

## Methods

### \_createClient

`Private` **_createClient**(): `void`

#### Returns

`void`

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:127](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L127)

___

### \_reconnect

`Private` **_reconnect**(): `void`

#### Returns

`void`

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:188](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L188)

___

### \_setState

`Private` **_setState**(`newState`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `newState` | [`SignalState`](../enums/dxos_messaging.SignalState.md) |

#### Returns

`void`

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:120](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L120)

___

### \_subscribeSwarmEvents

`Private` **_subscribeSwarmEvents**(`topic`, `peer_id`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `PublicKey` |
| `peer_id` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:266](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L266)

___

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:211](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L211)

___

### getStatus

**getStatus**(): [`SignalStatus`](../types/dxos_messaging.SignalStatus.md)

#### Returns

[`SignalStatus`](../types/dxos_messaging.SignalStatus.md)

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:223](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L223)

___

### join

**join**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.peer_id` | `PublicKey` |
| `__namedParameters.topic` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Implementation of

SignalMethods.join

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:234](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L234)

___

### leave

**leave**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.peer_id` | `PublicKey` |
| `__namedParameters.topic` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Implementation of

SignalMethods.leave

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:246](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L246)

___

### sendMessage

**sendMessage**(`msg`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `Message` |

#### Returns

`Promise`<`void`\>

#### Implementation of

SignalMethods.sendMessage

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:262](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L262)

___

### subscribeMessages

**subscribeMessages**(`peer_id`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `peer_id` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Implementation of

SignalMethods.subscribeMessages

#### Defined in

[packages/core/mesh/messaging/src/signal-client.ts:291](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L291)
