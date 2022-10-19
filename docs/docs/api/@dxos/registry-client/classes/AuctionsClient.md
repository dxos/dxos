# Class `AuctionsClient`
> Declared in [`packages/sdk/registry-client/src/api/auctions-client.ts`]()

Main API for DXNS auctions management.

## Constructors
```ts
new AuctionsClient (_backend: AuctionsClientBackend) => AuctionsClient
```

## Properties


## Functions
```ts
bidAuction (name: string, amount: number) => Promise<void>
```
Offers a new amount in the auction.
```ts
claimAuction (domainName: string, account: AccountKey) => Promise<DomainKey>
```
Allows for transferring the ownership of the name to the highest bidder.
```ts
closeAuction (name: string) => Promise<void>
```
Closes an auction. Note! This DOES NOT transfer the ownership to the highest bidder. They need to claim
by invoking separate operation.
```ts
createAuction (name: string, startAmount: number) => Promise<void>
```
Creates a new auction.
```ts
forceCloseAuction (name: string, sudoSignFn: SignTxFunction | AddressOrPair) => Promise<void>
```
Forces close an auction. This arbitrarily closes the ongoing auction even its time is not reached yet.
Note! This is reserved to sudo/admin accounts.
```ts
getAuction (name: string) => Promise<undefined | Auction>
```
Get an auction by name.
```ts
listAuctions () => Promise<Auction[]>
```
Returns a collection of all auctions (ongoing and closed) in DXOS.