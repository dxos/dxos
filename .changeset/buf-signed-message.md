---
'@dxos/protocols': minor
---

Move `DevtoolsHost.subscribeToCredentialMessages` off the protobuf.js codec: its `messages` field is
now `bufMessage(SignedMessageSchema)`. Same wire format, and the RPC's only handler is an
unimplemented stub, so no consumer observes the type change.
