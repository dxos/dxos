# Class: Messenger

[@dxos/messaging](../modules/dxos_messaging.md).Messenger

## Constructors

### constructor

**new Messenger**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`MessengerOptions`](../interfaces/dxos_messaging.MessengerOptions.md) |

#### Defined in

[packages/core/mesh/messaging/src/messenger.ts:45](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/messenger.ts#L45)

## Properties

### \_defaultListeners

 `Private` `Readonly` **\_defaultListeners**: `Set`<[`OnMessage`](../types/dxos_messaging.OnMessage.md)\>

#### Defined in

[packages/core/mesh/messaging/src/messenger.ts:37](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/messenger.ts#L37)

___

### \_listeners

 `Private` `Readonly` **\_listeners**: `Map`<`string`, `Set`<[`OnMessage`](../types/dxos_messaging.OnMessage.md)\>\>

#### Defined in

[packages/core/mesh/messaging/src/messenger.ts:36](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/messenger.ts#L36)

___

### \_onAckCallbacks

 `Private` `Readonly` **\_onAckCallbacks**: `ComplexMap`<`PublicKey`, () => `void`\>

#### Defined in

[packages/core/mesh/messaging/src/messenger.ts:41](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/messenger.ts#L41)

___

### \_receivedMessages

 `Private` `Readonly` **\_receivedMessages**: `ComplexSet`<`PublicKey`\>

#### Defined in

[packages/core/mesh/messaging/src/messenger.ts:42](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/messenger.ts#L42)

___

### \_retryDelay

 `Private` `Readonly` **\_retryDelay**: `number`

#### Defined in

[packages/core/mesh/messaging/src/messenger.ts:39](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/messenger.ts#L39)

___

### \_signalManager

 `Private` `Readonly` **\_signalManager**: [`SignalManager`](../interfaces/dxos_messaging.SignalManager.md)

#### Defined in

[packages/core/mesh/messaging/src/messenger.ts:35](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/messenger.ts#L35)

___

### \_subscriptions

 `Private` `Readonly` **\_subscriptions**: `SubscriptionGroup`

#### Defined in

[packages/core/mesh/messaging/src/messenger.ts:43](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/messenger.ts#L43)

___

### \_timeout

 `Private` `Readonly` **\_timeout**: `number`

#### Defined in

[packages/core/mesh/messaging/src/messenger.ts:40](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/messenger.ts#L40)

## Methods

### \_callListeners

`Private` **_callListeners**(`message`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Message` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/messaging/src/messenger.ts:234](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/messenger.ts#L234)

___

### \_encodeAndSend

`Private` **_encodeAndSend**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.author` | `PublicKey` |
| `__namedParameters.recipient` | `PublicKey` |
| `__namedParameters.reliablePayload` | `ReliablePayload` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/messaging/src/messenger.ts:139](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/messenger.ts#L139)

___

### \_handleAcknowledgement

`Private` **_handleAcknowledgement**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.payload` | `Any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/messaging/src/messenger.ts:203](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/messenger.ts#L203)

___

### \_handleMessage

`Private` **_handleMessage**(`message`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Message` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/messaging/src/messenger.ts:160](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/messenger.ts#L160)

___

### \_handleReliablePayload

`Private` **_handleReliablePayload**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Message` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/messaging/src/messenger.ts:173](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/messenger.ts#L173)

___

### \_sendAcknowledgement

`Private` **_sendAcknowledgement**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.author` | `PublicKey` |
| `__namedParameters.message_id` | `PublicKey` |
| `__namedParameters.recipient` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/messaging/src/messenger.ts:212](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/messenger.ts#L212)

___

### listen

**listen**(`payloadType`): [`ListeningHandle`](../interfaces/dxos_messaging.ListeningHandle.md)

Subscribes onMessage function to messages that contains payload with payloadType.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `payloadType` | `Object` | if not specified, onMessage will be subscribed to all types of messages. |
| `payloadType.onMessage` | [`OnMessage`](../types/dxos_messaging.OnMessage.md) | - |
| `payloadType.payloadType?` | `string` | - |

#### Returns

[`ListeningHandle`](../interfaces/dxos_messaging.ListeningHandle.md)

#### Defined in

[packages/core/mesh/messaging/src/messenger.ts:111](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/messenger.ts#L111)

___

### sendMessage

**sendMessage**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Message` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/messaging/src/messenger.ts:60](https://github.com/dxos/dxos/blob/main/packages/core/mesh/messaging/src/messenger.ts#L60)
