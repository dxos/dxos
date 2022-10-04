# Class: MessageRouter

[@dxos/network-manager](../modules/dxos_network_manager.md).MessageRouter

Adds offer/answer RPC and reliable messaging.

## Implements

- [`SignalMessaging`](../interfaces/dxos_network_manager.SignalMessaging.md)

## Constructors

### constructor

**new MessageRouter**(`__namedParameters?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `MessageRouterOptions` |

#### Defined in

[packages/core/mesh/network-manager/src/signal/message-router.ts:55](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/signal/message-router.ts#L55)

## Properties

### \_offerRecords

 `Private` `Readonly` **\_offerRecords**: `ComplexMap`<`PublicKey`, `OfferRecord`\>

#### Defined in

[packages/core/mesh/network-manager/src/signal/message-router.ts:52](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/signal/message-router.ts#L52)

___

### \_onOffer

 `Private` `Readonly` **\_onOffer**: (`message`: [`OfferMessage`](../interfaces/dxos_network_manager.OfferMessage.md)) => `Promise`<`Answer`\>

#### Type declaration

(`message`): `Promise`<`Answer`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | [`OfferMessage`](../interfaces/dxos_network_manager.OfferMessage.md) |

##### Returns

`Promise`<`Answer`\>

#### Defined in

[packages/core/mesh/network-manager/src/signal/message-router.ts:50](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/signal/message-router.ts#L50)

___

### \_onSignal

 `Private` `Readonly` **\_onSignal**: (`message`: [`SignalMessage`](../interfaces/dxos_network_manager.SignalMessage.md)) => `Promise`<`void`\>

#### Type declaration

(`message`): `Promise`<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | [`SignalMessage`](../interfaces/dxos_network_manager.SignalMessage.md) |

##### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/signal/message-router.ts:39](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/signal/message-router.ts#L39)

___

### \_sendMessage

 `Private` `Readonly` **\_sendMessage**: (`__namedParameters`: { `author`: `PublicKey` ; `payload`: `Any` ; `recipient`: `PublicKey`  }) => `Promise`<`void`\>

#### Type declaration

(`__namedParameters`): `Promise`<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.author` | `PublicKey` |
| `__namedParameters.payload` | `Any` |
| `__namedParameters.recipient` | `PublicKey` |

##### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/signal/message-router.ts:40](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/signal/message-router.ts#L40)

## Methods

### \_encodeAndSend

`Private` **_encodeAndSend**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.author` | `PublicKey` |
| `__namedParameters.message` | `SwarmMessage` |
| `__namedParameters.recipient` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/signal/message-router.ts:143](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/signal/message-router.ts#L143)

___

### \_handleOffer

`Private` **_handleOffer**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.author` | `PublicKey` |
| `__namedParameters.message` | `SwarmMessage` |
| `__namedParameters.recipient` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/signal/message-router.ts:177](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/signal/message-router.ts#L177)

___

### \_handleSignal

`Private` **_handleSignal**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.author` | `PublicKey` |
| `__namedParameters.message` | `SwarmMessage` |
| `__namedParameters.recipient` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/signal/message-router.ts:206](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/signal/message-router.ts#L206)

___

### \_resolveAnswers

`Private` **_resolveAnswers**(`message`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `SwarmMessage` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/signal/message-router.ts:164](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/signal/message-router.ts#L164)

___

### \_sendReliableMessage

`Private` **_sendReliableMessage**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.author` | `PublicKey` |
| `__namedParameters.message` | `MakeOptional`<`SwarmMessage`, ``"message_id"``\> |
| `__namedParameters.recipient` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/signal/message-router.ts:120](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/signal/message-router.ts#L120)

___

### offer

**offer**(`message`): `Promise`<`Answer`\>

Offer/answer RPC.

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | [`OfferMessage`](../interfaces/dxos_network_manager.OfferMessage.md) |

#### Returns

`Promise`<`Answer`\>

#### Implementation of

[SignalMessaging](../interfaces/dxos_network_manager.SignalMessaging.md).[offer](../interfaces/dxos_network_manager.SignalMessaging.md#offer)

#### Defined in

[packages/core/mesh/network-manager/src/signal/message-router.ts:105](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/signal/message-router.ts#L105)

___

### receiveMessage

**receiveMessage**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.author` | `PublicKey` |
| `__namedParameters.payload` | `Any` |
| `__namedParameters.recipient` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/network-manager/src/signal/message-router.ts:64](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/signal/message-router.ts#L64)

___

### signal

**signal**(`message`): `Promise`<`void`\>

Reliably send a signal to a peer.

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | [`SignalMessage`](../interfaces/dxos_network_manager.SignalMessage.md) |

#### Returns

`Promise`<`void`\>

#### Implementation of

[SignalMessaging](../interfaces/dxos_network_manager.SignalMessaging.md).[signal](../interfaces/dxos_network_manager.SignalMessaging.md#signal)

#### Defined in

[packages/core/mesh/network-manager/src/signal/message-router.ts:96](https://github.com/dxos/dxos/blob/main/packages/core/mesh/network-manager/src/signal/message-router.ts#L96)
