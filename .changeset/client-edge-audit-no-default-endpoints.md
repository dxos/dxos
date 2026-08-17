---
'@dxos/config': minor
'@dxos/plugin-calls': minor
---

Remove implicit EDGE endpoint defaults: an absent `runtime.services` section now means no edge. `ConfigService.load` materializes an empty first-run CLI profile instead of writing production endpoints to disk (`defaultConfig` is removed), `EDGE_SERVICE_DEFAULTS` is removed (`getEdgeServiceEndpoint` returns `undefined` when unconfigured), and edge-dependent features fail with a clear configuration error or render an unconfigured state instead of silently targeting DXOS-operated services. `configPreset` keeps its explicit environment presets. A client booted with an endpoint-free config performs no network activity and logs no warnings. Profiles written before this change are migrated on load: `ConfigService.load` drops the edge, ICE, and IPFS endpoints the old default seeded (matched exactly, so anything configured deliberately is kept) and rewrites the file. Breaking: `createTranscriber`, `useTranscriber`, and `useRecordingPipeline` now take a required `endpoint` argument, since there is no built-in transcription host to fall back on.
