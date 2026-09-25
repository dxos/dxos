---
'@dxos/config': minor
'@dxos/plugin-calls': minor
---

Remove implicit EDGE endpoint defaults: `getEdgeServiceEndpoint` returns `undefined` when `runtime.services.edgeServices` does not configure a service, and edge-dependent features render an unconfigured state or fail with a named configuration error instead of silently targeting DXOS-operated hosts. A client booted with an endpoint-free config performs no network activity and logs no warnings; transcription now rejects at `open()` with `TranscriptionEndpointNotConfiguredError` rather than falling back to a built-in host.
