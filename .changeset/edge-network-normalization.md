---
'@dxos/config': minor
'@dxos/client-protocol': minor
'@dxos/edge-client': minor
'@dxos/plugin-client': patch
'@dxos/plugin-onboarding': patch
'@dxos/plugin-support': patch
'@dxos/plugin-crm': patch
'@dxos/plugin-video': patch
'@dxos/plugin-code': patch
'@dxos/plugin-calls': patch
'@dxos/ai': patch
---

Every EDGE service is now addressed at one host per environment, with the service selected by a path
prefix rather than by its own hostname: `https://edge.network` (production),
`https://preview.dxos.network` (preview) and `https://dev.dxos.network` (dev), plus `/ai`, `/hub`,
`/image`, `/calls`, `/cors`, `/discord`, `/transcription`, `/introspect` and `/api/sandbox`.

`@dxos/config` exports `EDGE_URLS` and `EDGE_SERVICE_PATHS` as the source of truth, and
`EDGE_SERVICE_DEFAULTS` is derived from them. `configPreset`, the CLI profile templates,
`defaultConfig`, `DEFAULT_HUB_URL` and `DEFAULT_IMAGE_SERVICE_URL` all resolve against the new hosts.
The `*.dxos.network` hostnames stay attached as aliases, so existing deployments keep working; nothing
has to be migrated in step with this release.

Which EDGE environment each Composer environment talks to is unchanged.

Clients that build request URLs against a service base must APPEND the path — a base URL now carries a
path prefix, and `new URL('/thumbnail', base)` discards it. `EdgeServiceClient`, `HubHttpClient` and
`proxyFetchLegacy` do this internally; a caller passing its own base URL should do the same.

Trigger status moves to the prefixed path: `EdgeHttpClient.getSpaceTriggers` and
`getTriggersDispatcherStatus` now call `/compute/triggers/:spaceId` instead of `/triggers/:spaceId`.
The unprefixed path still answers and is flagged with a `Deprecation` header.
