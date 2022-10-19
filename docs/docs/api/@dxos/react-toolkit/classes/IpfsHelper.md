# Class `IpfsHelper`
> Declared in [`packages/sdk/react-toolkit/src/helpers/ipfs-helper.ts`]()

IPFS gateway HTTP methods.
Imported from wirelineio/appkit

## Constructors
```ts
new IpfsHelper (ipfsGateway: any) => IpfsHelper
```

## Properties
### `_ipfsGateway: string`

## Functions
```ts
_fetch (request: any, cid: string) => Promise<object>
```
```ts
download (cid: string) => Promise<string>
```
```ts
upload (body: any, contentType: string) => Promise<string>
```
```ts
url (cid: string) => string
```