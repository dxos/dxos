# Interface `KeyRecord`
> Declared in [`packages/core/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts`]()

Defined in:
   file://./../../../dxos/halo/keys.proto
## Properties
### [`added`]()
Type: `string`

An RFC-3339 date/time string for when the key was added to the Keyring.

Options:
  - proto3_optional = true
### [`created`]()
Type: `string`

An RFC-3339 date/time string for when the key was created.

Options:
  - proto3_optional = true
### [`hint`]()
Type: `boolean`

Is this key from a Greeting "hint"?

Options:
  - proto3_optional = true
### [`own`]()
Type: `boolean`

Determines if this is our key?
Usually true if  `secret_key`  is present; may be false for "inception keys" such as the Space key.

Options:
  - proto3_optional = true
### [`publicKey`]()
Type: [`PublicKey`](/api/@dxos/client/classes/PublicKey)

The public key as a Buffer (required).
### [`secretKey`]()
Type: `Buffer`

The secret key as a Buffer (this will never be visible outside the Keyring).

Options:
  - proto3_optional = true
### [`trusted`]()
Type: `boolean`

Is this key to be trusted?

Options:
  - proto3_optional = true
### [`type`]()
Type: [`KeyType`](/api/@dxos/client/enums#KeyType)

The  `KeyType`  type of the key. This is often unknown for keys from other sources.