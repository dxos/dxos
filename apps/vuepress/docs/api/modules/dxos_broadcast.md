# Module: @dxos/broadcast

## Table of contents

### Classes

- [Broadcast](../classes/dxos_broadcast.Broadcast.md)

### Interfaces

- [CacheOptions](../interfaces/dxos_broadcast.CacheOptions.md)
- [Middleware](../interfaces/dxos_broadcast.Middleware.md)
- [Options](../interfaces/dxos_broadcast.Options.md)
- [Peer](../interfaces/dxos_broadcast.Peer.md)
- [PublishOptions](../interfaces/dxos_broadcast.PublishOptions.md)

### Type Aliases

- [LookupFn](dxos_broadcast.md#lookupfn)
- [SendFn](dxos_broadcast.md#sendfn)
- [SubscribeFn](dxos_broadcast.md#subscribefn)

## Type Aliases

### LookupFn

Ƭ **LookupFn**<`P`\>: () => `Promise`<`P`[]\>

#### Type parameters

| Name |
| :------ |
| `P` |

#### Type declaration

▸ (): `Promise`<`P`[]\>

##### Returns

`Promise`<`P`[]\>

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:26](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/broadcast/src/broadcast.ts#L26)

___

### SendFn

Ƭ **SendFn**<`P`\>: (`message`: `Uint8Array`, `peer`: `P`, `options`: `unknown`) => `Promise`<`void`\>

#### Type parameters

| Name |
| :------ |
| `P` |

#### Type declaration

▸ (`message`, `peer`, `options`): `Promise`<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Uint8Array` |
| `peer` | `P` |
| `options` | `unknown` |

##### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:17](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/broadcast/src/broadcast.ts#L17)

___

### SubscribeFn

Ƭ **SubscribeFn**<`P`\>: (`onPacket`: (`packetEncoded`: `Uint8Array`) => `Packet` \| `undefined`, `updatePeers`: (`peers`: `P`[]) => `void`) => `Unsubscribe` \| `void`

#### Type parameters

| Name |
| :------ |
| `P` |

#### Type declaration

▸ (`onPacket`, `updatePeers`): `Unsubscribe` \| `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `onPacket` | (`packetEncoded`: `Uint8Array`) => `Packet` \| `undefined` |
| `updatePeers` | (`peers`: `P`[]) => `void` |

##### Returns

`Unsubscribe` \| `void`

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/broadcast/src/broadcast.ts#L21)
