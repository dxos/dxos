# Interface: Dxns

[Runtime](../modules/dxos_config.defs.Runtime.md).[Services](../modules/dxos_config.defs.Runtime.Services.md).Dxns

Defined in:
  file://./../../dxos/config.proto

## Properties

### account

 `Optional` **account**: `string`

Public address of a DXNS Account.

Options:
  - proto3_optional = true

#### Defined in

packages/core/protocols/dist/src/proto/gen/dxos/config.d.ts:666

___

### accountUri

 `Optional` **accountUri**: `string`

Substrate account URI. This is a secret.
KUBEs do not serve this with the config but we store it in profile.yml.

TODO(dmaretskyi): Deprecate this and move it to keyring.

Options:
  - proto3_optional = true

#### Defined in

packages/core/protocols/dist/src/proto/gen/dxos/config.d.ts:652

___

### address

 `Optional` **address**: `string`

Public Polkadot Address.

Options:
  - proto3_optional = true

#### Defined in

packages/core/protocols/dist/src/proto/gen/dxos/config.d.ts:659

___

### faucet

 `Optional` **faucet**: `string`

Options:
  - proto3_optional = true

#### Defined in

packages/core/protocols/dist/src/proto/gen/dxos/config.d.ts:671

___

### server

 `Optional` **server**: `string`

DXNS endpoint.

Options:
  - proto3_optional = true

#### Defined in

packages/core/protocols/dist/src/proto/gen/dxos/config.d.ts:642
