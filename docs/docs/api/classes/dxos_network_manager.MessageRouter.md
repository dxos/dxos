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

[packages/mesh/network-manager/src/signal/message-router.ts:54](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/signal/message-router.ts#L54)

## Properties

### \_offerRecords

 `Private` `Readonly` **\_offerRecords**: `ComplexMap`<`PublicKey`, `OfferRecord`\>

#### Defined in

[packages/mesh/network-manager/src/signal/message-router.ts:51](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/signal/message-router.ts#L51)

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

[packages/mesh/network-manager/src/signal/message-router.ts:49](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/signal/message-router.ts#L49)

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

[packages/mesh/network-manager/src/signal/message-router.ts:38](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/signal/message-router.ts#L38)

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

[packages/mesh/network-manager/src/signal/message-router.ts:39](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/signal/message-router.ts#L39)

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

[packages/mesh/network-manager/src/signal/message-router.ts:142](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/signal/message-router.ts#L142)

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

[packages/mesh/network-manager/src/signal/message-router.ts:176](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/signal/message-router.ts#L176)

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

[packages/mesh/network-manager/src/signal/message-router.ts:205](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/signal/message-router.ts#L205)

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

[packages/mesh/network-manager/src/signal/message-router.ts:163](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/signal/message-router.ts#L163)

___

### \_sendReliableMessage

`Private` **_sendReliableMessage**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.author` | `PublicKey` |
| `__namedParameters.message` | `MakeOptional`<`SwarmMessage`, ``"messageId"``\> |
| `__namedParameters.recipient` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/signal/message-router.ts:119](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/signal/message-router.ts#L119)

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

[packages/mesh/network-manager/src/signal/message-router.ts:104](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/signal/message-router.ts#L104)

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

[packages/mesh/network-manager/src/signal/message-router.ts:63](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/signal/message-router.ts#L63)

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

[packages/mesh/network-manager/src/signal/message-router.ts:95](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/signal/message-router.ts#L95)
