# Type alias: SubscribeFn<P\>

[@dxos/broadcast](../modules/dxos_broadcast.md).SubscribeFn

 **SubscribeFn**<`P`\>: (`onPacket`: (`packetEncoded`: `Uint8Array`) => `Packet` \| `undefined`, `updatePeers`: (`peers`: `P`[]) => `void`) => `Unsubscribe` \| `void`

#### Type parameters

| Name |
| :------ |
| `P` |

#### Type declaration

(`onPacket`, `updatePeers`): `Unsubscribe` \| `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `onPacket` | (`packetEncoded`: `Uint8Array`) => `Packet` \| `undefined` |
| `updatePeers` | (`peers`: `P`[]) => `void` |

##### Returns

`Unsubscribe` \| `void`

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:21](https://github.com/dxos/dxos/blob/main/packages/mesh/broadcast/src/broadcast.ts#L21)
