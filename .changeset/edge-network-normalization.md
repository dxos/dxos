---
'@dxos/config': minor
'@dxos/plugin-onboarding': patch
---

EDGE services are now addressed at one host per environment with the service selected by a path
prefix -- `https://dxos.network` (production), `https://preview.dxos.network` and
`https://dev.dxos.network` -- rather than at a hostname each. `EDGE_URLS` and `EDGE_SERVICE_PATHS`
in `@dxos/config` are the source of truth, and the legacy `*.dxos.network` service hostnames stay
attached, so nothing has to be migrated for this release.

A service base URL now carries a path, so callers building request URLs must APPEND to it --
`new URL('/thumbnail', base)` discards the prefix. `EdgeServiceClient`, `HubHttpClient` and
`proxyFetchLegacy` do this internally; a caller passing its own base URL should too.
`EdgeHttpClient.getSpaceTriggers` and `getTriggersDispatcherStatus` now call
`/compute/triggers/:spaceId`, the prefixed form of a path that still answers unprefixed.
