---
'@dxos/app-toolkit': minor
'@dxos/plugin-client': minor
'@dxos/edge-client': minor
'@dxos/cli-util': patch
---

Add `dx account signup <code>`, which validates an access code and then signs up with either email or an Atmosphere (atproto) OAuth account, mirroring Composer's sign-up flow. This replaces `dx account login --code`, which is removed — `login` recovers an existing account again, and account creation lives in `signup`. The `--method` name for the atproto OAuth path is now `atmosphere` in both commands, matching Composer's wording; `--method atproto` is still accepted as an alias.

The sign-up flows themselves move to `@dxos/app-toolkit/Account`, shared by Composer's welcome screen, the OAuth redirect finalizer, and the CLI: the pre-signup email probe, access-code validation and redemption, and OAuth registration completion are one implementation with typed errors (`EmailAlreadyRegisteredError`, `EmailProbeUnavailableError`, `AccountRedemptionError`). Supporting moves: the `Connection` type joins `AccessToken` and `Cursor` in `@dxos/link` (no longer exported from `@dxos/plugin-connector`), `ATMOSPHERE_SOURCE` joins `OAuthProvider` in `@dxos/protocols`, and the Atmosphere connector is identified by `OAuthProvider.ATPROTO` as its `Connector.id` (`ATMOSPHERE_PROVIDER_ID` is gone; the label is unchanged). Connections created before this carry `connectorId: 'atmosphere'` and no longer resolve to a registered connector — token refresh and source lookups are unaffected, but re-auth and per-connector actions need `connectorId` set to `'atproto'`. `LoginResponse.token` is also removed: no login path ever returned a recovery token inline (the magic link always goes out by email), so the field and its unreachable consumer branches are dropped.

Two fixes on the OAuth path: the CLI's OAuth round-trip now normalizes the configured edge URL to `http(s)` before calling `/oauth/initiate` (`fetch` rejects the `wss://` form that client configs carry, which broke `--method atmosphere` for both `signup` and `login`), and `getEdgeUrlWithProtocol` is exported from `@dxos/edge-client` so that normalization is shared rather than re-derived. `dx account signup` no longer prints `accountId` alongside `identityDid` — the hub keys accounts by identity DID, so the two were always the same value under two names.
