# Class `PublicKey`
Declared in [`packages/common/keys/dist/src/public-key.d.ts:15`]()


The purpose of this class is to assure consistent use of keys throughout the project.
Keys should be maintained as buffers in objects and proto definitions, and converted to hex
strings as late as possible (eg, to log/display).

## Constructors
### [`constructor`]()


Returns: [`PublicKey`](/api/@dxos/client/classes/PublicKey)

Arguments: 

`_value`: `Uint8Array`

## Properties


## Methods
### [`[custom]`]()


Used by Node.js to get textual representation of this object when it's printed with a  `console.log`  statement.

Returns: `string`

Arguments: 

`depth`: `number`

`options`: `InspectOptionsStylized`
### [`asBuffer`]()


Returns: `Buffer`

Arguments: none
### [`asUint8Array`]()


Returns: `Uint8Array`

Arguments: none
### [`equals`]()


Test this key for equality with some other key.

Returns: `boolean`

Arguments: 

`other`: `PublicKeyLike`
### [`toHex`]()


Returns: `string`

Arguments: none
### [`toJSON`]()


Returns: `string`

Arguments: none
### [`toString`]()


Returns: `string`

Arguments: none
### [`truncate`]()


Returns: `string`

Arguments: 

`length`: `number`
### [`assertValidPublicKey`]()


Asserts that provided values is an instance of PublicKey.

Returns: `asserts value is `[`PublicKey`](/api/@dxos/client/classes/PublicKey)

Arguments: 

`value`: `any`
### [`bufferize`]()


Returns: `Buffer`

Arguments: 

`str`: `string`
### [`equals`]()


Tests two keys for equality.

Returns: `boolean`

Arguments: 

`left`: `PublicKeyLike`

`right`: `PublicKeyLike`
### [`from`]()


Creates new instance of PublicKey automatically determining the input format.

Returns: [`PublicKey`](/api/@dxos/client/classes/PublicKey)

Arguments: 

`source`: `PublicKeyLike`
### [`fromHex`]()


Creates new instance of PublicKey from hex string.

Returns: [`PublicKey`](/api/@dxos/client/classes/PublicKey)

Arguments: 

`hex`: `string`
### [`hash`]()


To be used with ComplexMap and ComplexSet.
Returns a scalar representation for this key.

Returns: `string`

Arguments: 

`key`: [`PublicKey`](/api/@dxos/client/classes/PublicKey)
### [`isPublicKey`]()


Tests if provided values is an instance of PublicKey.

Returns: `value is `[`PublicKey`](/api/@dxos/client/classes/PublicKey)

Arguments: 

`value`: `any`
### [`random`]()


Creates a new key.

Returns: [`PublicKey`](/api/@dxos/client/classes/PublicKey)

Arguments: none
### [`stringify`]()


Returns: `string`

Arguments: 

`key`: `Uint8Array | Buffer`