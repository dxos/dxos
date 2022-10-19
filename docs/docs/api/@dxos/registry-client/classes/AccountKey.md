# Class `AccountKey`
> Declared in [`packages/sdk/registry-client/src/api/account-key.ts`]()

Represents an account key.

Account keys must conform to regex: /^[a-z0-9_]+$/.

## Constructors
```ts
new AccountKey (value: Uint8Array) => AccountKey
```

## Properties
### `value: Uint8Array`

## Functions
```ts
equals (other: string | AccountKey) => boolean
```
```ts
toHex () => string
```
```ts
toString () => string
```
```ts
equals (left: string | AccountKey, right: string | AccountKey) => boolean
```
```ts
fromHex (hexString: string) => AccountKey
```
```ts
random () => AccountKey
```