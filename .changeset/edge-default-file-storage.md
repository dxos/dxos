---
'@dxos/compute-runtime': minor
'@dxos/plugin-host-cloudflare': minor
---

Plugin bundles on EDGE get a default file storage backend (EDGE plugins spec D-84). A bundle's env takes an optional `BLOB_SERVICE` binding to EDGE's hosted blob store (`FileStorage.Env`); the host registers it as the default `edge` blob backend (`FunctionWrappingOptions.blobBackends`, new in `@dxos/compute-runtime`) and offers it as a `FileCapabilities.Backend` from a host plugin activated beside the bundle's own (`FileStorage`). plugin-file's `file.create*` operations no longer fail `NoBackendError` in a bundle, and no plugin has to contribute a backend on EDGE.
