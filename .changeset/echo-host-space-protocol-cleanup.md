---
'@dxos/echo-host': minor
---

Move the space protocol, control/feed pipeline, and metadata store out of `@dxos/echo-host` into `@dxos/client-services`. `@dxos/echo-host` now exposes only `EchoHost` and its Automerge/database implementation. Consumers of `SpaceManager`, `SpaceProtocol`, `Space`, `AuthProvider`/`AuthVerifier`, `Pipeline`, `MetadataStore`, `SqliteMetadataStore`, `createMappedFeedWriter`, and `valueEncoding` must now import them from `@dxos/client-services` (test helpers from `@dxos/client-services/testing`).
