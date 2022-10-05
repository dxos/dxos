# Interface: KeyRecord

[@dxos/client](../modules/dxos_client.md).KeyRecord

Defined in:
  file://./../../../dxos/halo/keys.proto

## Properties

### added

 `Optional` **added**: `string`

An RFC-3339 date/time string for when the key was added to the Keyring.

Options:
  - proto3_optional = true

#### Defined in

packages/core/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts:77

___

### created

 `Optional` **created**: `string`

An RFC-3339 date/time string for when the key was created.

Options:
  - proto3_optional = true

#### Defined in

packages/core/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts:84

___

### hint

 `Optional` **hint**: `boolean`

Is this key from a Greeting "hint"?

Options:
  - proto3_optional = true

#### Defined in

packages/core/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts:55

___

### own

 `Optional` **own**: `boolean`

Determines if this is our key?
Usually true if `secret_key` is present; may be false for "inception keys" such as the Party key.

Options:
  - proto3_optional = true

#### Defined in

packages/core/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts:63

___

### public_key

 **public_key**: [`PublicKey`](../classes/dxos_client.PublicKey.md)

The public key as a Buffer (required).

#### Defined in

packages/core/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts:41

___

### secret_key

 `Optional` **secret_key**: `Buffer`

The secret key as a Buffer (this will never be visible outside the Keyring).

Options:
  - proto3_optional = true

#### Defined in

packages/core/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts:48

___

### trusted

 `Optional` **trusted**: `boolean`

Is this key to be trusted?

Options:
  - proto3_optional = true

#### Defined in

packages/core/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts:70

___

### type

 **type**: [`KeyType`](../enums/dxos_client.KeyType.md)

The `KeyType` type of the key. This is often unknown for keys from other sources.

#### Defined in

packages/core/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts:37
