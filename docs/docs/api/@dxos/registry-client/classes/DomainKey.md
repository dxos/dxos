# Class `DomainKey`
> Declared in [`packages/sdk/registry-client/src/api/domain-key.ts`]()

Represents a domain key.

Domains must conform to regex: /^[a-z0-9_]+$/.

## Constructors
```ts
new DomainKey (value: Uint8Array) => DomainKey
```

## Properties
### `value: Uint8Array`

## Functions
```ts
toHex () => string
```
```ts
toString () => string
```
```ts
fromHex (hexString: string) => DomainKey
```
```ts
random () => DomainKey
```