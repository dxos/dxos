---
'@dxos/protocols': minor
'@dxos/compute': minor
'@dxos/compute-runtime': minor
'@dxos/edge-client': minor
'@dxos/plugin-connector': minor
'@dxos/plugin-inbox': minor
'@dxos/plugin-client': minor
---

Google OAuth access tokens are no longer replicated through ECHO. EDGE now stores the granted token
and returns a `MANAGED_ACCESS_TOKEN` placeholder in its place, which consumers exchange for a live
token per use via `Credential.AccessTokenResolver` (EDGE serves it only to members of the owning
space). `OnTokenCreated` and `TestConnection` gain an `accessTokenValue` input carrying the resolved
token — connectors must read that rather than `accessToken.token`. Existing connections keep working
until their token expires; re-authenticating migrates them.
