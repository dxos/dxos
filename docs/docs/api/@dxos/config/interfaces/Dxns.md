# Interface `Dxns`
> Declared in [`packages/core/protocols/dist/src/proto/gen/dxos/config.d.ts`]()

Defined in:
   file://./../../dxos/config.proto
## Properties
### `account: string`
Public address of a DXNS Account.

Options:
  - proto3_optional = true
### `accountUri: string`
Substrate account URI. This is a secret.
KUBEs do not serve this with the config but we store it in profile.yml.

TODO(dmaretskyi): Deprecate this and move it to keyring.

Options:
  - proto3_optional = true
### `address: string`
Public Polkadot Address.

Options:
  - proto3_optional = true
### `faucet: string`
Options:
  - proto3_optional = true
### `server: string`
DXNS endpoint.

Options:
  - proto3_optional = true