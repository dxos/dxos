# Class `RegistryClient`
> Declared in [`packages/sdk/registry-client/src/api/registry-client.ts`]()

Main API for DXNS registry.

## Constructors
```ts
new RegistryClient (_backend: RegistryClientBackend) => RegistryClient
```

## Properties


## Functions
```ts
getDomainKey (domainName: string) => Promise<DomainKey>
```
Resolves a domain key from the domain name.
```ts
getRecord <T> (cid: CID) => Promise<undefined | RegistryRecord<T>>
```
Gets record details by CID.
```ts
getRecordByName <T> (name: DXN) => Promise<undefined | RegistryRecord<T>>
```
Gets resource by its registered name.
```ts
getResource (name: DXN) => Promise<undefined | CID>
```
Gets resource by its registered name.
```ts
getTypeRecord (cid: CID) => Promise<undefined | RegistryType>
```
Gets type records details by CID.
```ts
listAuthorities () => Promise<Authority[]>
```
Returns a list of authorities created in DXOS system.
```ts
listRecords (filter: Filter) => Promise<RegistryRecord<any>[]>
```
Lists records in the system.
```ts
listResources (filter: Filter) => Promise<ResourceSet[]>
```
List resources registered in the system.
```ts
listTypeRecords (filter: Filter) => Promise<RegistryType[]>
```
Lists type records in the system.
```ts
registerAuthority (account: AccountKey) => Promise<DomainKey>
```
Creates a new domain in the system under a generated name.
```ts
registerRecord (data: unknown, typeId: CID, meta: RecordMetadata) => Promise<CID>
```
Creates a new data record in the system.
```ts
registerResource (name: DXN, cid: undefined | CID, owner: AccountKey) => Promise<void>
```
Registers or updates a resource in the system.
Undefined CID means that the resource will be deleted.
```ts
registerTypeRecord (messageName: string, schema: Root, meta: TypeRecordMetadata) => Promise<CID>
```
Creates a new type record in the system.