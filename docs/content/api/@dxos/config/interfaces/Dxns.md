# Interface `Dxns`
> Declared in [`core/protocols/dist/esm/src/proto/gen/dxos/config.d.ts`]()

Defined in:
   file://./../../dxos/config.proto
## Properties
### [account]()
Type: <code>string</code>

Public address of a DXNS Account.

Options:
  - proto3_optional = true

### [accountUri]()
Type: <code>string</code>

Substrate account URI. This is a secret.
KUBEs do not serve this with the config but we store it in profile.yml.

TODO(dmaretskyi): Deprecate this and move it to keyring.

Options:
  - proto3_optional = true

### [address]()
Type: <code>string</code>

Public Polkadot Address.

Options:
  - proto3_optional = true

### [faucet]()
Type: <code>string</code>

Options:
  - proto3_optional = true

### [server]()
Type: <code>string</code>

DXNS endpoint.

Options:
  - proto3_optional = true

    