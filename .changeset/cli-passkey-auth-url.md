---
'@dxos/protocols': minor
'@dxos/plugin-client': minor
---

Send `dx account login --method passkey` to the auth origin rather than the hub's API host.

A passkey is bound to the WebAuthn relying party it was registered against, and Composer pins that to `composer.space` rather than the page host, so only an origin under that domain can present one. The hub answers on its API host as well, where the prompt renders, returns 200, and then fails in the browser with `SecurityError` and nothing else to go on. MCP avoided this by pinning `DX_AUTH_BASE_URL` to a blessed hostname, an unwritten constraint each new caller had to rediscover.

`Runtime.Services.Hub` gains `auth_url`, resolved by `Account.getAuthUrl` the same way `url` is resolved by `getHubUrl`: `DX_AUTH_URL`, then `runtime.services.hub.authUrl`, then `DEFAULT_AUTH_URL` (`https://account.composer.space`). The `dev` and `local` CLI profiles set it to the dev hub's own serving origin.
