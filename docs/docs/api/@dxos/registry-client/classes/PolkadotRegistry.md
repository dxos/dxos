# Class `PolkadotRegistry`
> Declared in [`packages/sdk/registry-client/src/polkadot/registry.ts`]()

Polkadot DXNS registry client backend.

## Constructors
```ts
new PolkadotRegistry (api: ApiPromise, signFn: SignTxFunction | AddressOrPair) => PolkadotRegistry
```

## Properties
### `api: ApiPromise`
### `transactionsHandler: ApiTransactionHandler`

## Functions
```ts
getDomainKey (domainName: string) => Promise<DomainKey>
```
```ts
getRecord (cid: CID) => Promise<undefined | RecordWithCid>
```
```ts
getResource (name: DXN) => Promise<undefined | CID>
```
```ts
listAuthorities () => Promise<Authority[]>
```
```ts
listRecords () => Promise<RecordWithCid[]>
```
```ts
listResources () => Promise<[DXN, CID][]>
```
```ts
registerAuthority (owner: AccountKey) => Promise<DomainKey>
```
```ts
registerRecord (record: Record) => Promise<CID>
```
```ts
registerRecordBytes (data: Uint8Array) => Promise<CID>
```
```ts
registerResource (name: DXN, cid: CID, owner: AccountKey) => Promise<void>
```