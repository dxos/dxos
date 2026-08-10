---
'@dxos/link': minor
'@dxos/protocols': minor
'@dxos/plugin-connector': minor
'@dxos/plugin-atproto': minor
---

Move the `Connection` type to `@dxos/link`, alongside `AccessToken` and `Cursor`, so packages below plugin-connector can create connections. `Connection` is no longer exported from `@dxos/plugin-connector` — import it from `@dxos/link`.

The Atmosphere connector constants move with it: `ATMOSPHERE_SOURCE` now lives in `@dxos/protocols` beside `OAuthProvider` and `ATPROTO_OAUTH_SCOPES`, and `ATMOSPHERE_PROVIDER_ID` is gone — the connector is identified by `OAuthProvider.ATPROTO` as its `Connector.id`, with `label: 'Atmosphere'` unchanged. Connections created before this carry `connectorId: 'atmosphere'` and no longer resolve to a registered connector: token refresh and `AccessToken.source` lookups are unaffected, but re-auth and per-connector actions need `connectorId` set to `'atproto'`.
