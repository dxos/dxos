# Class: Messenger

[@dxos/messaging](../modules/dxos_messaging.md).Messenger

## Table of contents

### Constructors

- [constructor](dxos_messaging.Messenger.md#constructor)

### Properties

- [\_defaultListeners](dxos_messaging.Messenger.md#_defaultlisteners)
- [\_listeners](dxos_messaging.Messenger.md#_listeners)
- [\_onAckCallbacks](dxos_messaging.Messenger.md#_onackcallbacks)
- [\_receivedMessages](dxos_messaging.Messenger.md#_receivedmessages)
- [\_retryDelay](dxos_messaging.Messenger.md#_retrydelay)
- [\_signalManager](dxos_messaging.Messenger.md#_signalmanager)
- [\_subscriptions](dxos_messaging.Messenger.md#_subscriptions)
- [\_timeout](dxos_messaging.Messenger.md#_timeout)

### Methods

- [\_callListeners](dxos_messaging.Messenger.md#_calllisteners)
- [\_encodeAndSend](dxos_messaging.Messenger.md#_encodeandsend)
- [\_handleAcknowledgement](dxos_messaging.Messenger.md#_handleacknowledgement)
- [\_handleMessage](dxos_messaging.Messenger.md#_handlemessage)
- [\_handleReliablePayload](dxos_messaging.Messenger.md#_handlereliablepayload)
- [\_sendAcknowledgement](dxos_messaging.Messenger.md#_sendacknowledgement)
- [listen](dxos_messaging.Messenger.md#listen)
- [sendMessage](dxos_messaging.Messenger.md#sendmessage)

## Constructors

### constructor

• **new Messenger**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`MessengerOptions`](../interfaces/dxos_messaging.MessengerOptions.md) |

#### Defined in

[packages/mesh/messaging/src/messenger.ts:44](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L44)

## Properties

### \_defaultListeners

• `Private` `Readonly` **\_defaultListeners**: `Set`<[`OnMessage`](../modules/dxos_messaging.md#onmessage)\>

#### Defined in

[packages/mesh/messaging/src/messenger.ts:36](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L36)

___

### \_listeners

• `Private` `Readonly` **\_listeners**: `Map`<`string`, `Set`<[`OnMessage`](../modules/dxos_messaging.md#onmessage)\>\>

#### Defined in

[packages/mesh/messaging/src/messenger.ts:35](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L35)

___

### \_onAckCallbacks

• `Private` `Readonly` **\_onAckCallbacks**: `ComplexMap`<`PublicKey`, () => `void`\>

#### Defined in

[packages/mesh/messaging/src/messenger.ts:40](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L40)

___

### \_receivedMessages

• `Private` `Readonly` **\_receivedMessages**: `ComplexSet`<`PublicKey`\>

#### Defined in

[packages/mesh/messaging/src/messenger.ts:41](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L41)

___

### \_retryDelay

• `Private` `Readonly` **\_retryDelay**: `number`

#### Defined in

[packages/mesh/messaging/src/messenger.ts:38](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L38)

___

### \_signalManager

• `Private` `Readonly` **\_signalManager**: [`SignalManager`](../interfaces/dxos_messaging.SignalManager.md)

#### Defined in

[packages/mesh/messaging/src/messenger.ts:34](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L34)

___

### \_subscriptions

• `Private` `Readonly` **\_subscriptions**: `SubscriptionGroup`

#### Defined in

[packages/mesh/messaging/src/messenger.ts:42](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L42)

___

### \_timeout

• `Private` `Readonly` **\_timeout**: `number`

#### Defined in

[packages/mesh/messaging/src/messenger.ts:39](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L39)

## Methods

### \_callListeners

▸ `Private` **_callListeners**(`message`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Message` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/messaging/src/messenger.ts:233](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L233)

___

### \_encodeAndSend

▸ `Private` **_encodeAndSend**(`__namedParameters`): `Promise`<`void`\>

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

[packages/mesh/messaging/src/messenger.ts:138](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L138)

___

### \_handleAcknowledgement

▸ `Private` **_handleAcknowledgement**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.payload` | `Any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/messaging/src/messenger.ts:202](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L202)

___

### \_handleMessage

▸ `Private` **_handleMessage**(`message`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Message` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/messaging/src/messenger.ts:159](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L159)

___

### \_handleReliablePayload

▸ `Private` **_handleReliablePayload**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Message` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/messaging/src/messenger.ts:172](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L172)

___

### \_sendAcknowledgement

▸ `Private` **_sendAcknowledgement**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.author` | `PublicKey` |
| `__namedParameters.messageId` | `PublicKey` |
| `__namedParameters.recipient` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/messaging/src/messenger.ts:211](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L211)

___

### listen

▸ **listen**(`payloadType`): [`ListeningHandle`](../interfaces/dxos_messaging.ListeningHandle.md)

Subscribes onMessage function to messages that contains payload with payloadType.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `payloadType` | `Object` | if not specified, onMessage will be subscribed to all types of messages. |
| `payloadType.onMessage` | [`OnMessage`](../modules/dxos_messaging.md#onmessage) | - |
| `payloadType.payloadType?` | `string` | - |

#### Returns

[`ListeningHandle`](../interfaces/dxos_messaging.ListeningHandle.md)

#### Defined in

[packages/mesh/messaging/src/messenger.ts:110](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L110)

___

### sendMessage

▸ **sendMessage**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Message` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/messaging/src/messenger.ts:59](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L59)
