---
'@dxos/edge-client': minor
'@dxos/client-protocol': minor
'@dxos/config': minor
'@dxos/app-toolkit': minor
---

Hub-service is addressed only through EDGE, at `<edge>/hub`, so it no longer has a URL of its own.

`HubHttpClient` is gone: its account, invitation, email-verification and metering methods moved
onto `EdgeHttpClient` (prefixed `hub/…`), so `client.edge.http` answers them and a surface holds
one client instead of two. `DX_HUB_URL`, `runtime.services.hub.url` and `DEFAULT_HUB_URL` are
removed — `DX_EDGE_BASE_URL` / `runtime.services.edge.url` is the single endpoint. `Runtime.Services.Hub`
goes with them (field 17 reserved): its only other member was the passkey origin, which is now
configured solely as `DX_AUTH_URL` and read by `Account.getAuthUrl`.

`Account.getHubUrl` and `Account.createHubClient` are replaced by `Account.createAccountClient(edgeUrl)`,
and the account flows (`checkAccessCode`, `probeEmail`, `redeemAccessCode`, `signUpWithEmail`) take
`edge` in place of `hub`.

Composer's login page is now armed by its own `DX_SHOW_LOGIN_PAGE=true` rather than inferred from the
presence of a hub URL, which also gates the account, invitations and usage panels. The flag is read by
`Account.showLoginPage` in `@dxos/plugin-client` — Composer's own layer, not the SDK's.
