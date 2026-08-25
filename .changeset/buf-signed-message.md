---
'@dxos/protocols': minor
---

Route service RPC payloads through buf. `protoMessage()` resolves each type in a buf registry over
the generated file descriptors and encodes via the shape-compat layer, which preserves the
protobuf.js field shapes, so no call site changes. Types whose descriptors carry a transitive
`google.protobuf.Any` stay on the protobuf.js codec — 31 of 46 route through buf today.

Fixes a `google.protobuf.Struct` double-encoding bug in that layer: `protoc-gen-es` already types a
Struct field as a plain `JsonObject`, so re-encoding it produced a Struct keyed `fields` and decoded
valid legacy bytes to `{}`. It affected every service call, since `dxos.error.Error` carries the only
Struct on the RPC error channel.

`DevtoolsHost.subscribeToCredentialMessages` also moves to `bufMessage(SignedMessageSchema)`; its
only handler is an unimplemented stub, so no consumer observes the type change.
