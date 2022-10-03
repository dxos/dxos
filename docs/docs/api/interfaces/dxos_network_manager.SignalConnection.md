# Interface: SignalConnection

[@dxos/network-manager](../modules/dxos_network_manager.md).SignalConnection

Signal peer discovery interface.

## Methods

### join

**join**(`params`): `Promise`<`void`\>

Join topic on signal network, to be discoverable by other peers.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.peerId` | `PublicKey` |
| `params.topic` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/signal/signal-connection.ts:14](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/signal/signal-connection.ts#L14)

___

### leave

**leave**(`params`): `Promise`<`void`\>

Leave topic on signal network, to stop being discoverable by other peers.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.peerId` | `PublicKey` |
| `params.topic` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/network-manager/src/signal/signal-connection.ts:19](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/signal/signal-connection.ts#L19)
