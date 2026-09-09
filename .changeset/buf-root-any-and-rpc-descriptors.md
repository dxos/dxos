---
'@dxos/echo': patch
---

Complete the protobuf.js → buf migration and remove `@dxos/codec-protobuf` and
`@dxos/protobuf-compiler`.

Every `@dxos/*` package now reads and writes protobuf through `@bufbuild/protobuf` and the
generated `@dxos/protocols/buf/*` modules. `@dxos/protocols` no longer ships the protobuf.js
schema (`./proto`, `./proto/*`) or the shape-compat layer (`./buf-shape-compat`), and the
`protobufjs` dependency is gone from the workspace.

**Breaking:** the message shapes change with the codec. proto3 makes every message field
optional, so a `PublicKey`-valued field reads as possibly-undefined and carries raw bytes rather
than a `PublicKey` instance — `toPublicKey`/`requirePublicKey`/`fromPublicKey` from
`@dxos/protocols/buf` convert at the boundary. Nested types and enums flatten (`Device.PresenceState`
→ `Device_PresenceState`), oneofs are tagged unions (`{ case, value }`) rather than flat optional
fields, `google.protobuf.Timestamp` is a `Timestamp` rather than a `Date` (`toDate`/`fromDate`), a
`google.protobuf.Any` is packed rather than inlined under `@type` (`anyPack`/`anyUnpack`), and
message literals are built with `create(Schema, …)`.

Fix `space.postMessage` dropping its payload: the request carried a bare `google.protobuf.Any`,
which neither codec substituted at the schema root, so a serialized transport wrote an empty `Any`
and the payload never reached the wire. A gossip channel's payload now travels as JSON packed into
that `Any` by `packJson`.

The credential signature format is unchanged. A signature covers the canonical form of the
credential's substituted shape rather than its wire bytes, so the shape is reproduced from the buf
descriptor in `@dxos/credentials`, and a checked-in golden vector — a credential signed by an
earlier build, with its exact signing payload — pins the format so a future change cannot silently
invalidate previously-issued credentials.
