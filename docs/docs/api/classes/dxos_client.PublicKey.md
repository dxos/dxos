# Class: PublicKey

[@dxos/client](../modules/dxos_client.md).PublicKey

The purpose of this class is to assure consistent use of keys throughout the project.
Keys should be maintained as buffers in objects and proto definitions, and converted to hex
strings as late as possible (eg, to log/display).

## Constructors

### constructor

**new PublicKey**(`_value`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_value` | `Uint8Array` |

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:58

## Properties

### \_value

 `Private` `Readonly` **\_value**: `any`

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:16

## Methods

### [custom]

**[custom]**(`depth`, `options`): `string`

Used by NodeJS to get textual representation of this object when it's printed with a `console.log` statement.

#### Parameters

| Name | Type |
| :------ | :------ |
| `depth` | `number` |
| `options` | `InspectOptionsStylized` |

#### Returns

`string`

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:83

___

### asBuffer

**asBuffer**(): `Buffer`

Covert this key to buffer.

#### Returns

`Buffer`

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:66

___

### asUint8Array

**asUint8Array**(): `Uint8Array`

Return underlying Uint8Array representation.

#### Returns

`Uint8Array`

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:62

___

### equals

**equals**(`other`): `boolean`

Test this key for equality with some other key.

#### Parameters

| Name | Type |
| :------ | :------ |
| `other` | `PublicKeyLike` |

#### Returns

`boolean`

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:87

___

### toHex

**toHex**(): `string`

Convert this key to hex-encoded string.

#### Returns

`string`

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:70

___

### toJSON

**toJSON**(): `string`

Same as `PublicKey.humanize()`.

#### Returns

`string`

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:78

___

### toString

**toString**(): `string`

Same as `PublicKey.humanize()`.

#### Returns

`string`

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:74

___

### truncate

**truncate**(`n?`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `n?` | `number` |

#### Returns

`string`

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:79

___

### assertValidPublicKey

`Static` **assertValidPublicKey**(`value`): asserts value is PublicKey

Asserts that provided values is an instance of PublicKey.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `any` |

#### Returns

asserts value is PublicKey

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:36

___

### bufferize

`Static` **bufferize**(`str`): `Buffer`

**`Deprecated`**

All keys should be represented as instances of PublicKey.

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `string` |

#### Returns

`Buffer`

Key buffer.

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:46

___

### equals

`Static` **equals**(`left`, `right`): `boolean`

Tests two keys for equality.

#### Parameters

| Name | Type |
| :------ | :------ |
| `left` | `PublicKeyLike` |
| `right` | `PublicKeyLike` |

#### Returns

`boolean`

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:40

___

### from

`Static` **from**(`source`): [`PublicKey`](dxos_client.PublicKey.md)

Creates new instance of PublicKey automatically determining the input format.

#### Parameters

| Name | Type |
| :------ | :------ |
| `source` | `PublicKeyLike` |

#### Returns

[`PublicKey`](dxos_client.PublicKey.md)

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:20

___

### fromHex

`Static` **fromHex**(`hex`): [`PublicKey`](dxos_client.PublicKey.md)

Creates new instance of PublicKey from hex string.

#### Parameters

| Name | Type |
| :------ | :------ |
| `hex` | `string` |

#### Returns

[`PublicKey`](dxos_client.PublicKey.md)

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:24

___

### hash

`Static` **hash**(`key`): `string`

To be used with ComplexMap and ComplexSet.
Returns a scalar representation for this key.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | [`PublicKey`](dxos_client.PublicKey.md) |

#### Returns

`string`

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:57

___

### isPublicKey

`Static` **isPublicKey**(`value`): value is PublicKey

Tests if provided values is an instance of PublicKey.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `any` |

#### Returns

value is PublicKey

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:32

___

### random

`Static` **random**(): [`PublicKey`](dxos_client.PublicKey.md)

Creates a new key.

#### Returns

[`PublicKey`](dxos_client.PublicKey.md)

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:28

___

### stringify

`Static` **stringify**(`key`): `string`

**`Deprecated`**

All keys should be represented as instances of PublicKey.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `Buffer` \| `Uint8Array` |

#### Returns

`string`

Hex string representation of key.

#### Defined in

packages/common/keys/dist/src/public-key.d.ts:52
