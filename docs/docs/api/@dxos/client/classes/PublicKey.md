# Class `PublicKey`
<sub>Declared in [packages/common/keys/dist/src/public-key.d.ts:15]()</sub>


The purpose of this class is to assure consistent use of keys throughout the project.
Keys should be maintained as buffers in objects and proto definitions, and converted to hex
strings as late as possible (eg, to log/display).

## Constructors
### [constructor(_value)]()


Returns: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

Arguments: 

`_value`: <code>Uint8Array</code>

## Properties

## Methods
### [\[custom\](depth, options)]()


Used by Node.js to get textual representation of this object when it's printed with a  `console.log`  statement.

Returns: <code>string</code>

Arguments: 

`depth`: <code>number</code>

`options`: <code>InspectOptionsStylized</code>
### [asBuffer()]()


Returns: <code>Buffer</code>

Arguments: none
### [asUint8Array()]()


Returns: <code>Uint8Array</code>

Arguments: none
### [equals(other)]()


Test this key for equality with some other key.

Returns: <code>boolean</code>

Arguments: 

`other`: <code>PublicKeyLike</code>
### [toHex()]()


Returns: <code>string</code>

Arguments: none
### [toJSON()]()


Returns: <code>string</code>

Arguments: none
### [toString()]()


Returns: <code>string</code>

Arguments: none
### [truncate(\[length\])]()


Returns: <code>string</code>

Arguments: 

`length`: <code>number</code>
### [assertValidPublicKey(value)]()


Asserts that provided values is an instance of PublicKey.

Returns: <code>asserts value is [PublicKey](/api/@dxos/client/classes/PublicKey)</code>

Arguments: 

`value`: <code>any</code>
### [bufferize(str)]()


Returns: <code>Buffer</code>

Arguments: 

`str`: <code>string</code>
### [equals(left, right)]()


Tests two keys for equality.

Returns: <code>boolean</code>

Arguments: 

`left`: <code>PublicKeyLike</code>

`right`: <code>PublicKeyLike</code>
### [from(source)]()


Creates new instance of PublicKey automatically determining the input format.

Returns: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

Arguments: 

`source`: <code>PublicKeyLike</code>
### [fromHex(hex)]()


Creates new instance of PublicKey from hex string.

Returns: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

Arguments: 

`hex`: <code>string</code>
### [hash(key)]()


To be used with ComplexMap and ComplexSet.
Returns a scalar representation for this key.

Returns: <code>string</code>

Arguments: 

`key`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>
### [isPublicKey(value)]()


Tests if provided values is an instance of PublicKey.

Returns: <code>value is [PublicKey](/api/@dxos/client/classes/PublicKey)</code>

Arguments: 

`value`: <code>any</code>
### [random()]()


Creates a new key.

Returns: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

Arguments: none
### [stringify(key)]()


Returns: <code>string</code>

Arguments: 

`key`: <code>Uint8Array | Buffer</code>