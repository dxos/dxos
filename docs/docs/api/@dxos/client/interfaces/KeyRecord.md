# Interface `KeyRecord`
> Declared in [`packages/core/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts`]()

Defined in:
   file://./../../../dxos/halo/keys.proto
## Properties
### `added: string`
An RFC-3339 date/time string for when the key was added to the Keyring.

Options:
  - proto3_optional = true
### `created: string`
An RFC-3339 date/time string for when the key was created.

Options:
  - proto3_optional = true
### `hint: boolean`
Is this key from a Greeting "hint"?

Options:
  - proto3_optional = true
### `own: boolean`
Determines if this is our key?
Usually true if  `secret_key`  is present; may be false for "inception keys" such as the Party key.

Options:
  - proto3_optional = true
### `publicKey: PublicKey`
The public key as a Buffer (required).
### `secretKey: Buffer`
The secret key as a Buffer (this will never be visible outside the Keyring).

Options:
  - proto3_optional = true
### `trusted: boolean`
Is this key to be trusted?

Options:
  - proto3_optional = true
### `type: KeyType`
The  `KeyType`  type of the key. This is often unknown for keys from other sources.