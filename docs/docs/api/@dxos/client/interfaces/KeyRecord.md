# Interface `KeyRecord`
> Declared in [`packages/core/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts`]()

Defined in:
   file://./../../../dxos/halo/keys.proto
## Properties
### [added]()
Type: <code>string</code>

An RFC-3339 date/time string for when the key was added to the Keyring.

Options:
  - proto3_optional = true
### [created]()
Type: <code>string</code>

An RFC-3339 date/time string for when the key was created.

Options:
  - proto3_optional = true
### [hint]()
Type: <code>boolean</code>

Is this key from a Greeting "hint"?

Options:
  - proto3_optional = true
### [own]()
Type: <code>boolean</code>

Determines if this is our key?
Usually true if  `secret_key`  is present; may be false for "inception keys" such as the Space key.

Options:
  - proto3_optional = true
### [publicKey]()
Type: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

The public key as a Buffer (required).
### [secretKey]()
Type: <code>Buffer</code>

The secret key as a Buffer (this will never be visible outside the Keyring).

Options:
  - proto3_optional = true
### [trusted]()
Type: <code>boolean</code>

Is this key to be trusted?

Options:
  - proto3_optional = true
### [type]()
Type: <code>[KeyType](/api/@dxos/client/enums#KeyType)</code>

The  `KeyType`  type of the key. This is often unknown for keys from other sources.