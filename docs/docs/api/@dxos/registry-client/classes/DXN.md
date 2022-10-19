# Class `DXN`
> Declared in [`packages/sdk/registry-client/src/api/dxn.ts`]()

Decentralized Name.
Example: dxn://example:foo/bar

## Constructors
```ts
new DXN (authority: string | DomainKey, path: string, tag: string) => DXN
```

## Properties
### `authority: string | DomainKey`
### `path: string`
### `tag: string`

## Functions
```ts
toString () => string
```
```ts
with (__namedParameters: object) => DXN
```
Create new DXN overriding specified fields.
```ts
fromDomainKey (domainKey: DomainKey, path: string, tag: string) => DXN
```
```ts
fromDomainName (domainName: string, path: string, tag: string) => DXN
```
```ts
parse (name: string) => DXN
```
```ts
urldecode (encodedDxn: string) => DXN
```
```ts
urlencode (dxn: DXN) => string
```