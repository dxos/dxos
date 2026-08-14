---
'@dxos/config': minor
'@dxos/plugin-calls': minor
---

Remove every built-in EDGE endpoint default: an absent `runtime.services` section now means no edge. `defaultConfig` no longer materializes production endpoints into first-run CLI profiles, `configPreset` emits an edge URL only for an explicitly named environment, `EDGE_SERVICE_DEFAULTS` is removed (`getEdgeServiceEndpoint` returns `undefined` when unconfigured), and edge-dependent features fail with a clear configuration error or render an unconfigured state instead of silently targeting DXOS-operated services. A client booted with an endpoint-free config performs no network activity and logs no warnings.
