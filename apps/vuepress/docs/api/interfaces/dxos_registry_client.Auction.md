# Interface: Auction

[@dxos/registry-client](../modules/dxos_registry_client.md).Auction

Auction allows assigning names to identities.
It facilitates domain names registration and ownership.

## Table of contents

### Properties

- [closed](dxos_registry_client.Auction.md#closed)
- [endBlock](dxos_registry_client.Auction.md#endblock)
- [highestBid](dxos_registry_client.Auction.md#highestbid)
- [name](dxos_registry_client.Auction.md#name)

## Properties

### closed

• **closed**: `boolean`

If true - auction is closed and the name is owned by the highest bidder.
If false - it is an ongoing auction.

#### Defined in

[packages/sdk/registry-client/src/api/auctions.ts:39](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/auctions.ts#L39)

___

### endBlock

• **endBlock**: `BigNumber`

The number of the blockchain block mined that acts as last update timestamp.

#### Defined in

[packages/sdk/registry-client/src/api/auctions.ts:33](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/auctions.ts#L33)

___

### highestBid

• **highestBid**: `Object`

The highest offer currently winning the auction.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `amount` | `BigNumber` |
| `bidder` | `string` |

#### Defined in

[packages/sdk/registry-client/src/api/auctions.ts:25](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/auctions.ts#L25)

___

### name

• **name**: `string`

`Name` which is an object and purpose of the auction.

#### Defined in

[packages/sdk/registry-client/src/api/auctions.ts:20](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/auctions.ts#L20)
