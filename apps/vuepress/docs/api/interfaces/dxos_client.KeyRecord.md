# Interface: KeyRecord

[@dxos/client](../modules/dxos_client.md).KeyRecord

Defined in:
  file://./../../../dxos/halo/keys.proto

## Table of contents

### Properties

- [added](dxos_client.KeyRecord.md#added)
- [created](dxos_client.KeyRecord.md#created)
- [hint](dxos_client.KeyRecord.md#hint)
- [own](dxos_client.KeyRecord.md#own)
- [publicKey](dxos_client.KeyRecord.md#publickey)
- [secretKey](dxos_client.KeyRecord.md#secretkey)
- [trusted](dxos_client.KeyRecord.md#trusted)
- [type](dxos_client.KeyRecord.md#type)

## Properties

### added

• `Optional` **added**: `string`

An RFC-3339 date/time string for when the key was added to the Keyring.

Options:
  - proto3_optional = true

#### Defined in

packages/common/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts:77

___

### created

• `Optional` **created**: `string`

An RFC-3339 date/time string for when the key was created.

Options:
  - proto3_optional = true

#### Defined in

packages/common/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts:84

___

### hint

• `Optional` **hint**: `boolean`

Is this key from a Greeting "hint"?

Options:
  - proto3_optional = true

#### Defined in

packages/common/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts:55

___

### own

• `Optional` **own**: `boolean`

Determines if this is our key?
Usually true if `secretKey` is present; may be false for "inception keys" such as the Party key.

Options:
  - proto3_optional = true

#### Defined in

packages/common/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts:63

___

### publicKey

• **publicKey**: `PublicKey`

The public key as a Buffer (required).

#### Defined in

packages/common/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts:41

___

### secretKey

• `Optional` **secretKey**: `Buffer`

The secret key as a Buffer (this will never be visible outside the Keyring).

Options:
  - proto3_optional = true

#### Defined in

packages/common/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts:48

___

### trusted

• `Optional` **trusted**: `boolean`

Is this key to be trusted?

Options:
  - proto3_optional = true

#### Defined in

packages/common/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts:70

___

### type

• **type**: [`KeyType`](../enums/dxos_client.KeyType.md)

The `KeyType` type of the key. This is often unknown for keys from other sources.

#### Defined in

packages/common/protocols/dist/src/proto/gen/dxos/halo/keys.d.ts:37
