---
'@dxos/compute-runtime': minor
'@dxos/plugin-file': patch
---

A file operation invoked in a headless host — an agent calling `file.createFromUpload` or `file.createFromSource` through an operation service — can now reach a hosted blob store, where before it failed however well the upload itself had gone.

`@dxos/compute-runtime`: `FunctionWrappingOptions` takes `blobBackends`, so the host of an invocation can register its own blob storage alongside the S3 backend the runtime registers itself. A hosted store is reached through whatever the host has — a Cloudflare service binding on EDGE, an HTTP client in the app — and neither is constructible from this package, so the runtime could only ever offer S3 and inline storage. Each entry names the backend, supplies it, and may claim the invocation's default storage; all of them are unregistered when the context closes, as the S3 registration already was.

`@dxos/plugin-file`: the two operations a person does not drive from the UI resolve their storage preference without demanding a registered `FileCapabilities.Backend` descriptor. That check is a settings-UI sanity check — it asks whether settings has anything to show — and a headless host registers no plugin capabilities at all, so it could never pass there and failed every invocation with `NoBackendError` before any store was consulted. `Create`, which is UI-driven, keeps the check; the other two fall through to the Blob registry's own default, and a store that cannot serve the request still says so itself.
