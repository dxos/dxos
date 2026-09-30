---
'@dxos/plugin-client': minor
---

`plugin-client` now exposes the client's config, EDGE HTTP client and ECHO graph as the `Config`, `EdgeHttpClient` and `Hypergraph` capabilities, and provides `ConfigService` and `EdgeHttpClientService` to operations, so plugins can use them without depending on `@dxos/client`. Breaking: `PreviewLinkContext` now carries `db` instead of `space`, `TranscriptOperation.Create` takes `db` instead of `space`, and `TranscriptionManager.setFeed` takes a database instead of a space.
