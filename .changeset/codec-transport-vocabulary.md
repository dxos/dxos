---
'@dxos/codec-protobuf': minor
'@dxos/protobuf-compiler': minor
'@dxos/client-protocol': minor
'@dxos/client-services': minor
'@dxos/echo-client': minor
'@dxos/feed-store': minor
'@dxos/hypercore': minor
'@dxos/messaging': minor
'@dxos/protocols': minor
'@dxos/rpc': minor
'@dxos/teleport-extension-gossip': minor
---

Move the transport vocabulary into `@dxos/codec`.

`Any`, `Codec`, `EncodingOptions`, `RequestOptions`, `Struct`, `WithTypeUrl`, `TaggedType`,
`TypedProtoMessage`, `ServiceBackend`, `ServiceProvider` and `ServiceDescriptorLike` now live in
`@dxos/codec` and are no longer exported from `@dxos/codec-protobuf`, which implements them instead
of defining them. Import them from `@dxos/codec`; generated service stubs already do.
