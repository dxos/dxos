# Class `PolkadotAuctions`
> Declared in [`packages/sdk/registry-client/src/polkadot/auctions.ts`]()

Polkadot DXNS auctions client backend.

## Constructors
```ts
new PolkadotAuctions (api: ApiPromise, signFn: SignTxFunction | AddressOrPair) => PolkadotAuctions
```

## Properties
### `api: ApiPromise`
### `transactionsHandler: ApiTransactionHandler`

## Functions
```ts
bidAuction (name: string, amount: number) => Promise<void>
```
```ts
claimAuction (domainName: string, account: AccountKey) => Promise<DomainKey>
```
```ts
closeAuction (name: string) => Promise<void>
```
```ts
createAuction (name: string, startAmount: number) => Promise<void>
```
```ts
forceCloseAuction (name: string, sudoSignFn: SignTxFunction | AddressOrPair) => Promise<void>
```
```ts
getAuction (name: string) => Promise<undefined | Auction>
```
```ts
listAuctions () => Promise<Auction[]>
```