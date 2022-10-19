# Class `CID`
> Declared in [`packages/sdk/registry-client/src/api/cid.ts`]()

Conten-addressable ID.
https://docs.ipfs.io/concepts/content-addressing

## Constructors
```ts
new CID (value: Uint8Array) => CID
```

## Properties
### `value: Uint8Array`

## Functions
```ts
[custom] () => string
```
```ts
equals (other: CIDLike) => boolean
```
```ts
toB58String () => string
```
```ts
toString () => string
```
```ts
from (value: CIDLike) => CID
```
```ts
fromB58String (str: string) => CID
```