---
'@dxos/protocols': minor
---

`@dxos/protocols` gains a `./buf-shape-compat` entry point: `encodeCompat` / `decodeCompat` encode and decode buf (`@bufbuild/protobuf`) messages using the same JS object shapes the protobuf.js codec produces, so call sites can move to buf one at a time without every substituted field (`PublicKey`, `PrivateKey`, `TimeframeVector`, `Struct`, `Timestamp`) changing type under them.

A message carrying `google.protobuf.Any` throws `UnsupportedSubstitutionError` rather than encode a differently-shaped value: the protobuf.js version resolves the payload through the schema registry via an `@type` discriminator and honours the `preserve_any` field option, which needs a buf-side type registry.

The keyring (`dxos.halo.keyring.KeyRecord`) and the SQLite heads store (`dxos.echo.query.Heads`) now encode through this layer. Neither message has substituted fields, so the wire format is unchanged — asserted byte-for-byte against the protobuf.js codec. The heads store no longer needs its lazy-codec workaround, since the buf codec loads in workerd.

`@dxos/effect-proto` (private, unpublished) is removed; its only consumer was a `@dxos/react-ui-form` storybook, now driven by a hand-authored Effect Schema.
