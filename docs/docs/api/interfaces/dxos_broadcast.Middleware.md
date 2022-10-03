# Interface: Middleware<P\>

[@dxos/broadcast](../modules/dxos_broadcast.md).Middleware

## Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends [`Peer`](dxos_broadcast.Peer.md) = [`Peer`](dxos_broadcast.Peer.md) |

## Properties

### lookup

 `Optional` `Readonly` **lookup**: [`LookupFn`](../types/dxos_broadcast.LookupFn.md)<`P`\>

**`Deprecated`**

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:34](https://github.com/dxos/dxos/blob/main/packages/mesh/broadcast/src/broadcast.ts#L34)

___

### send

 `Readonly` **send**: [`SendFn`](../types/dxos_broadcast.SendFn.md)<`P`\>

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:29](https://github.com/dxos/dxos/blob/main/packages/mesh/broadcast/src/broadcast.ts#L29)

___

### subscribe

 `Readonly` **subscribe**: [`SubscribeFn`](../types/dxos_broadcast.SubscribeFn.md)<`P`\>

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:30](https://github.com/dxos/dxos/blob/main/packages/mesh/broadcast/src/broadcast.ts#L30)
