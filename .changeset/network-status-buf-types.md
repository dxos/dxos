---
'@dxos/client': minor
---

Move the network carrier group to buf types

`NetworkService` and `EdgeAgentService` now speak buf messages, so the types they carry change
shape for consumers:

- `MeshProxy.networkStatus` reports the buf `NetworkStatus`. Its `swarm` field uses the buf
  `ConnectionState` enum, imported from `@dxos/protocols/buf/dxos/client/services_pb` rather than
  `@dxos/protocols/proto/dxos/client/services`.
- Nested enums flatten: `EdgeStatus.ConnectionState.X` becomes `EdgeStatus_ConnectionState.X`, and
  `QueryAgentStatusResponse.AgentStatus.X` becomes `QueryAgentStatusResponse_AgentStatus.X`.
- Building one of these messages by object literal no longer typechecks; construct it with
  `create(NetworkStatusSchema, { … })` from `@bufbuild/protobuf`.

Both codecs produce identical wire bytes, so no persisted or in-flight data changes.
