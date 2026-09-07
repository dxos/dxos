---
'@dxos/config': patch
'@dxos/plugin-sandbox': patch
---

Every EDGE service is now addressed as `<env>.dxos.network/<service>`, derived from one configured
entrypoint. `getEdgeServiceEndpoint` falls back to `runtime.services.edge.url` plus the service's
path prefix, so configuring EDGE configures calls, image, transcription, discord, the CORS proxy,
introspect and sandbox with it; `runtime.services.edgeServices` stays as the per-service override and
no longer has to be populated. An unconfigured client still resolves nothing.

No client path contains `/api/<service>` any more: the calls API moved from `/api/calls` to
`<edge>/calls/rtc`, sandbox-service's REST API from `<host>/api/sandbox` to `<edge>/sandbox`, and the
CORS proxy from `cors.dxos.network` to `<edge>/cors-proxy`. Video transcripts are fetched directly rather
than through the CORS proxy, since the EDGE entrypoint sends CORS headers that the worker's own
hostname did not.

Requires the paired `dxos/edge` change to be deployed to production FIRST. That change is additive —
every path a released Composer calls keeps answering — so the two can land in either order without an
outage, but a build made from this commit only works against an EDGE that serves the prefixes.

`configPreset({ sandbox })` sets `runtime.services.sandbox.url` only for `local`; the deployed
sandbox-service is reached through EDGE.
