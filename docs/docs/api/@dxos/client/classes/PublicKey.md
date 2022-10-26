# Class `PublicKey`
> Declared in [`packages/common/keys/dist/src/public-key.d.ts:15`]()


The purpose of this class is to assure consistent use of keys throughout the project.
Keys should be maintained as buffers in objects and proto definitions, and converted to hex
strings as late as possible (eg, to log/display).

## Constructors
### constructor
```ts
(_value: Uint8Array) => PublicKey
```

## Properties


## Methods
### [custom]
```ts
(depth: number, options: InspectOptionsStylized) => string
```
Used by NodeJS to get textual representation of this object when it's printed with a  `console.log`  statement.
### asBuffer
```ts
() => Buffer
```
Covert this key to buffer.
### asUint8Array
```ts
() => Uint8Array
```
Return underlying Uint8Array representation.
### equals
```ts
(other: PublicKeyLike) => boolean
```
Test this key for equality with some other key.
### toHex
```ts
() => string
```
Convert this key to hex-encoded string.
### toJSON
```ts
() => string
```
Same as  `PublicKey.humanize()` .
### toString
```ts
() => string
```
Same as  `PublicKey.humanize()` .
### truncate
```ts
(n: number) => string
```
### assertValidPublicKey
```ts
(value: any) => asserts value is PublicKey
```
Asserts that provided values is an instance of PublicKey.
### bufferize
```ts
(str: string) => Buffer
```
### equals
```ts
(left: PublicKeyLike, right: PublicKeyLike) => boolean
```
Tests two keys for equality.
### from
```ts
(source: PublicKeyLike) => PublicKey
```
Creates new instance of PublicKey automatically determining the input format.
### fromHex
```ts
(hex: string) => PublicKey
```
Creates new instance of PublicKey from hex string.
### hash
```ts
(key: PublicKey) => string
```
To be used with ComplexMap and ComplexSet.
Returns a scalar representation for this key.
### isPublicKey
```ts
(value: any) => value is PublicKey
```
Tests if provided values is an instance of PublicKey.
### random
```ts
() => PublicKey
```
Creates a new key.
### stringify
```ts
(key: Buffer | Uint8Array) => string
```