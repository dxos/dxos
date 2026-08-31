---
'@dxos/protocols': minor
---

Finishes the client-services protobuf-removal pass for the last three services —
`DataService`, `DevtoolsHost`, `SpacesService` — completing the effect-rpc conversion for all
13 client services. Inlines the remaining `protoMessage`-wrapped payloads that had no shared
consumers outside the RPC boundary (`DataService`'s `BatchedDocumentUpdates`/`SpaceSyncState`;
`DevtoolsHost`'s `Event`, `StorageInfo`, `GetSnapshotsResponse`, `SubscribeToFeedsResponse`,
`SubscribeToSignalStatusResponse`) as Effect schemas, and deletes every proto message body and
`service {}` block left dead by this and earlier partial-inlining passes — `dxos/echo/service.proto`
is removed outright, and `dxos/devtools/host.proto`/`dxos/client/services.proto` keep only the
handful of messages still embedding un-inlinable proto substitutions (`Timeframe`, etc.).
`ClientServices.DataService`/`DevtoolsHost`/`SpacesService` are now typed via hand-written
Promise/Stream interfaces instead of generated protobuf service types.
