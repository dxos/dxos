---
'@dxos/cli-util': minor
'@dxos/plugin-client': minor
---

Finish `dx account login` from the browser, for both email and passkey.

`--method email` previously dead-ended: the emailed link redirected to `APP_URL`, so a CLI login left you digging the token out of a URL bar. The command now starts a local callback server before asking the hub for a link and advertises it as the `redirectUrl`, so the hub's activation route returns the browser to the CLI instead of to a web app that may not be running. Clicking the link is the whole flow -- the token prompt is gone, since a link that only ever redirects to loopback cannot be completed anywhere else. A host that cannot bind a port now fails with that reason instead of asking for a paste.

`--method passkey` is new. The prompt runs on a hub-served page rather than in the CLI, because WebAuthn scopes a credential to a relying party and a page served from a loopback port can only ever name `localhost` -- a `composer.space` passkey is never offered to one. The CLI opens the hub's `/auth/verify?purpose=device` with its loopback origin as the callback and waits; the hub verifies the assertion, shows which identity signed, and on approval mints the same login token the emailed link mints. Both methods now end in the same `recoverIdentity({ token })` call, and no assertion reaches this process.

What keeps a link to that page from authorizing a stranger's terminal is the callback rule: the token is only ever delivered to a loopback origin, so a phished approval lands on the victim's own machine. Neither method works over SSH for the same reason -- a browser on another machine has nowhere to return to, which is what device invitations are for.

The shared callback server moved from `@dxos/cli-util/oauth` to `@dxos/cli-util/callback` and is now named `startLocalCallbackServer` -- it is no longer OAuth-only. `OAUTH_TIMEOUT_MS` is `CALLBACK_TIMEOUT_MS` there, and it takes an optional `successMessage` for the page the browser lands on. `LoginRequestSchema` gains `redirectUrl`, which hub-service already accepted.
