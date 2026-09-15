---
'@dxos/config': minor
---

EDGE's own entrypoint is now one host per environment -- `https://dxos.network` (production),
`https://preview.dxos.network`, `https://dev.dxos.network` and `http://localhost:8787` -- exposed as
`EDGE_URLS` in `@dxos/config`, which `configPreset`, `defaultConfig` and the CLI profile templates
resolve against instead of holding their own strings. The dev tier moves off
`edge.dxos.workers.dev` onto `dev.dxos.network`, which the same worker already serves.

hub-service is now reached at `<edge>/hub`, so a service base URL can carry a path. `HubHttpClient`
normalizes its base to a trailing slash and issues relative request paths, since
`new URL('/account/me', base)` would otherwise discard the prefix; a caller passing its own base URL
gets the same treatment. `EdgeHttpClient.getSpaceTriggers` and `getTriggersDispatcherStatus` now
call `/compute/triggers/:spaceId`, the prefixed form of a path that still answers unprefixed.
