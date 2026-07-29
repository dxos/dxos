---
'@dxos/protocols': minor
'@dxos/compute': minor
'@dxos/compute-runtime': minor
'@dxos/edge-client': minor
'@dxos/plugin-connector': minor
'@dxos/plugin-inbox': minor
'@dxos/plugin-client': minor
'@dxos/plugin-github': patch
'@dxos/plugin-linear': patch
'@dxos/plugin-slack': patch
'@dxos/plugin-trello': patch
---

Google OAuth access tokens are no longer replicated through ECHO. EDGE stores the granted token and
returns a `MANAGED_ACCESS_TOKEN` placeholder in its place, which `Credential.CredentialsService`
resolves transparently — consumers no longer see whether a credential came from the space or from
EDGE. `CredentialQuery` gains `accessTokenId` so a specific `AccessToken` can be looked up rather
than any credential for a service, which also fixes a by-service lookup that picked arbitrarily among
a space's several connections to the same provider. `OnTokenCreated` and `TestConnection` now take
`Credential.CredentialsService` in their requirement channel rather than reading `accessToken.token`.
Existing connections keep working until their token expires; re-authenticating migrates them.
