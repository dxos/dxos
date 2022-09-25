# Class: Broadcast<P\>

[@dxos/broadcast](../modules/dxos_broadcast.md).Broadcast

Abstract module to send broadcast messages.

## Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends [`Peer`](../interfaces/dxos_broadcast.Peer.md) = [`Peer`](../interfaces/dxos_broadcast.Peer.md) |

## Constructors

### constructor

**new Broadcast**<`P`\>(`middleware`, `options?`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends [`Peer`](../interfaces/dxos_broadcast.Peer.md) = [`Peer`](../interfaces/dxos_broadcast.Peer.md) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `middleware` | [`Middleware`](../interfaces/dxos_broadcast.Middleware.md)<`P`\> |
| `options` | [`Options`](../interfaces/dxos_broadcast.Options.md) |

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:90](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L90)

## Properties

### \_codec

 `Private` `Readonly` **\_codec**: `ProtoCodec`<`Packet`\>

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:74](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L74)

___

### \_id

 `Private` `Readonly` **\_id**: `Buffer`

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:73](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L73)

___

### \_isOpen

 `Private` **\_isOpen**: `boolean` = `false`

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:81](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L81)

___

### \_lookup

 `Private` `Readonly` **\_lookup**: `undefined` \| [`LookupFn`](../types/dxos_broadcast.LookupFn.md)<`P`\>

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:78](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L78)

___

### \_peers

 `Private` **\_peers**: `P`[] = `[]`

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:82](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L82)

___

### \_seenSeqs

 `Private` `Readonly` **\_seenSeqs**: `FixedLru`

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:79](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L79)

___

### \_send

 `Private` `Readonly` **\_send**: [`SendFn`](../types/dxos_broadcast.SendFn.md)<`P`\>

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:76](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L76)

___

### \_subscribe

 `Private` `Readonly` **\_subscribe**: [`SubscribeFn`](../types/dxos_broadcast.SubscribeFn.md)<`P`\>

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:77](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L77)

___

### \_unsubscribe

 `Private` **\_unsubscribe**: `undefined` \| `Unsubscribe`

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:83](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L83)

___

### packet

 `Readonly` **packet**: `Event`<`Packet`\>

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:87](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L87)

___

### send

 `Readonly` **send**: `Event`<[packetEncoded: Uint8Array, peer: P]\>

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:85](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L85)

___

### sendError

 `Readonly` **sendError**: `Event`<`Error`\>

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:86](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L86)

___

### subscribeError

 `Readonly` **subscribeError**: `Event`<`Error`\>

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:88](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L88)

## Methods

### \_onPacket

`Private` **_onPacket**(`packetEncoded`): `undefined` \| `Packet`

Process incoming encoded packets.

#### Parameters

| Name | Type |
| :------ | :------ |
| `packetEncoded` | `Uint8Array` |

#### Returns

`undefined` \| `Packet`

Returns the packet if the decoding was successful.

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:221](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L221)

___

### \_publish

`Private` **_publish**(`packet`, `options?`): `Promise`<`undefined` \| `Packet`\>

Publish and/or Forward a packet message to each peer neighbor.

#### Parameters

| Name | Type |
| :------ | :------ |
| `packet` | `Packet` |
| `options` | `Object` |

#### Returns

`Promise`<`undefined` \| `Packet`\>

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:187](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L187)

___

### close

**close**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:169](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L169)

___

### open

**open**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:158](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L158)

___

### pruneCache

**pruneCache**(): `void`

Prune the internal cache items in timeout

#### Returns

`void`

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:149](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L149)

___

### publish

**publish**(`data`, `options?`): `Promise`<`undefined` \| `Packet`\>

Broadcast a flooding message to the peers neighbors.

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `Uint8Array` |
| `options` | [`PublishOptions`](../interfaces/dxos_broadcast.PublishOptions.md) |

#### Returns

`Promise`<`undefined` \| `Packet`\>

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:112](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L112)

___

### updateCache

**updateCache**(`opts?`): `void`

Update internal cache options

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | [`CacheOptions`](../interfaces/dxos_broadcast.CacheOptions.md) |

#### Returns

`void`

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:136](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L136)

___

### updatePeers

**updatePeers**(`peers`): `void`

Update internal list of peers.

#### Parameters

| Name | Type |
| :------ | :------ |
| `peers` | `P`[] |

#### Returns

`void`

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:128](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/broadcast/src/broadcast.ts#L128)
