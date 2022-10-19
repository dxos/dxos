# Interface `Auction`
> Declared in [`packages/sdk/registry-client/src/api/auctions.ts`]()

Auction allows assigning names to identities.
It facilitates domain names registration and ownership.
## Properties
### `closed: boolean`
If true - auction is closed and the name is owned by the highest bidder.
If false - it is an ongoing auction.
### `endBlock: BigNumber`
The number of the blockchain block mined that acts as last update timestamp.
### `highestBid: object`
The highest offer currently winning the auction.
### `name: string`
`Name`  which is an object and purpose of the auction.