# Interface: Middleware<P\>

[@dxos/broadcast](../modules/dxos_broadcast.md).Middleware

## Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends [`Peer`](dxos_broadcast.Peer.md) = [`Peer`](dxos_broadcast.Peer.md) |

## Table of contents

### Properties

- [lookup](dxos_broadcast.Middleware.md#lookup)
- [send](dxos_broadcast.Middleware.md#send)
- [subscribe](dxos_broadcast.Middleware.md#subscribe)

## Properties

### lookup

• `Optional` `Readonly` **lookup**: [`LookupFn`](../modules/dxos_broadcast.md#lookupfn)<`P`\>

**`Deprecated`**

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:34](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/broadcast/src/broadcast.ts#L34)

___

### send

• `Readonly` **send**: [`SendFn`](../modules/dxos_broadcast.md#sendfn)<`P`\>

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:29](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/broadcast/src/broadcast.ts#L29)

___

### subscribe

• `Readonly` **subscribe**: [`SubscribeFn`](../modules/dxos_broadcast.md#subscribefn)<`P`\>

#### Defined in

[packages/mesh/broadcast/src/broadcast.ts:30](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/broadcast/src/broadcast.ts#L30)
