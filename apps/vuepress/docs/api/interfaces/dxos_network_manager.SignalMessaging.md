# Interface: SignalMessaging

[@dxos/network-manager](../modules/dxos_network_manager.md).SignalMessaging

Signal peer messaging interface.

## Implemented by

- [`MessageRouter`](../classes/dxos_network_manager.MessageRouter.md)

## Methods

### offer

**offer**(`msg`): `Promise`<`Answer`\>

Offer/answer RPC.

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | [`OfferMessage`](dxos_network_manager.OfferMessage.md) |

#### Returns

`Promise`<`Answer`\>

#### Defined in

[packages/mesh/network-manager/src/signal/signal-messaging.ts:32](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/signal/signal-messaging.ts#L32)

___

### signal

**signal**(`msg`): `Promise`<`void`\>

Reliably send a signal to a peer.

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | [`SignalMessage`](dxos_network_manager.SignalMessage.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/signal/signal-messaging.ts:37](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/network-manager/src/signal/signal-messaging.ts#L37)
