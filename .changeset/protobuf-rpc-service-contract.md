---
'@dxos/protocols': minor
---

**Breaking:** the RPC service contract (`RequestOptions`, `AnyEnvelope`, `TaggedType`, `ServiceBackend`, `ServiceProvider`, `ServiceDescriptorLike`) now lives in `@dxos/protocols/service-contract`; import it from there instead of `@dxos/codec-protobuf`. `ServiceDescriptorLike.createClient`/`createServer` take the compat layer's `CompatOptions` rather than protobuf.js's `EncodingOptions`, and `@dxos/codec-protobuf`'s `ServiceDescriptor.createClient` is declared to return the service type alone rather than intersected with its internal stub holder.

`@dxos/rpc`, `@dxos/client-protocol`, `@dxos/messaging` and `@dxos/blade-runner` no longer depend on `@dxos/codec-protobuf`.
