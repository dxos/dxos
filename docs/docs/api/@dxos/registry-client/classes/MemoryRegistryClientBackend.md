# Class `MemoryRegistryClientBackend`
> Declared in [`packages/sdk/registry-client/src/testing/memory-registry-client.ts`]()

In-memory implementation of the registry client with statically specified records.
Useful for testing code which relies on the DXNS registry without connecting to a real node.

## Constructors
```ts
new MemoryRegistryClientBackend () => MemoryRegistryClientBackend
```

## Properties
### `authorities: Map<string, Authority>`
### `records: ComplexMap<CID, Record>`
### `resources: ComplexMap<DXN, CID>`

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
registerDomainName (domainName: string, owner: AccountKey) => Promise<Authority>
```
```ts
registerRecord (record: Record) => Promise<CID>
```
```ts
registerResource (name: DXN, cid: undefined | CID, owner: AccountKey) => Promise<void>
```