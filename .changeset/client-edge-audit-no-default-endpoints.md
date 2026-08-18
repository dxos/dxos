---
'@dxos/config': minor
'@dxos/plugin-calls': minor
---

Remove implicit EDGE endpoint defaults: an absent `runtime.services` section now means no edge. `ConfigService.load` writes the endpoints into the CLI profile it creates and no code path substitutes them afterwards, so what the CLI talks to is stated in a file the user can read and edit; a profile whose hub URL is missing now errors instead of falling back. `EDGE_SERVICE_DEFAULTS` is removed (`getEdgeServiceEndpoint` returns `undefined` when unconfigured), and edge-dependent features fail with a clear configuration error or render an unconfigured state instead of silently targeting DXOS-operated services. `configPreset` keeps its explicit environment presets. A client booted with an endpoint-free config performs no network activity and logs no warnings. Breaking: `createTranscriber`, `useTranscriber`, and `useRecordingPipeline` now take a required `endpoint` argument, since there is no built-in transcription host to fall back on.
