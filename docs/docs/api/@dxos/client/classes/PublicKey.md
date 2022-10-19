# Class `PublicKey`
> Declared in [`packages/common/keys/dist/src/public-key.d.ts:15`]()


The purpose of this class is to assure consistent use of keys throughout the project.
Keys should be maintained as buffers in objects and proto definitions, and converted to hex
strings as late as possible (eg, to log/display).

## Constructors
```ts
new PublicKey (_value: Uint8Array) => PublicKey
```

## Properties


## Functions
```ts
[custom] (depth: number, options: InspectOptionsStylized) => string
```
Used by NodeJS to get textual representation of this object when it's printed with a  `console.log`  statement.
```ts
asBuffer () => Buffer
```
Covert this key to buffer.
```ts
asUint8Array () => Uint8Array
```
Return underlying Uint8Array representation.
```ts
equals (other: PublicKeyLike) => boolean
```
Test this key for equality with some other key.
```ts
toHex () => string
```
Convert this key to hex-encoded string.
```ts
toJSON () => string
```
Same as  `PublicKey.humanize()` .
```ts
toString () => string
```
Same as  `PublicKey.humanize()` .
```ts
truncate (n: number) => string
```
```ts
assertValidPublicKey (value: any) => asserts value is PublicKey
```
Asserts that provided values is an instance of PublicKey.
```ts
bufferize (str: string) => Buffer
```
```ts
equals (left: PublicKeyLike, right: PublicKeyLike) => boolean
```
Tests two keys for equality.
```ts
from (source: PublicKeyLike) => PublicKey
```
Creates new instance of PublicKey automatically determining the input format.
```ts
fromHex (hex: string) => PublicKey
```
Creates new instance of PublicKey from hex string.
```ts
hash (key: PublicKey) => string
```
To be used with ComplexMap and ComplexSet.
Returns a scalar representation for this key.
```ts
isPublicKey (value: any) => value is PublicKey
```
Tests if provided values is an instance of PublicKey.
```ts
random () => PublicKey
```
Creates a new key.
```ts
stringify (key: Buffer | Uint8Array) => string
```