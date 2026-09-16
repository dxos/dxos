---
'@dxos/protocols': minor
---

Service descriptors can now be resolved from buf, via the new `@dxos/protocols/buf-service` export. `getBufService(typeName)` returns a descriptor built from `DescService` that encodes payloads through the shape-compat layer, and it is interchangeable with the protobuf.js one inside a `ServiceBundle`.

`@dxos/codec-protobuf` gains `ServiceDescriptorLike`, the contract a service bundle actually needs — `name`, `createClient`, `createServer`. `ServiceDescriptor` implements it, and `@dxos/rpc`'s `ServiceBundle` is typed against it, so `pb.Service` is no longer reachable from the RPC layer.

Wire-visible change for anyone reading it: `Any.type_url` on the RPC service path now carries buf's dot-free `typeName` rather than protobuf.js's dot-prefixed `fullName`. Peers dispatch on `Request.method` and decode `payload.value` by the method's declared type, so this is inert across versions — asserted by fixtures pairing a legacy peer with a buf one in both directions. The dot-free form already matched everywhere else: `Codec.encode` has always written it, and the messaging and swarm paths compare against it exactly.
