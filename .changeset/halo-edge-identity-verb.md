---
'@dxos/halo': minor
'@dxos/plugin-payments': minor
---

`Identity.getEdgeIdentity()` returns the signed-in identity as an EDGE/Hub authentication principal — `Option<EdgeIdentity>` carrying the DID, the local device's peer key, and the `presentCredentials({ challenge })` signer that EDGE's `401` verifiable-presentation handshake requires. It is structurally the `EdgeIdentity` of `@dxos/edge-client`, so consumers hand it straight to `EdgeHttpClient.setIdentity` or `handleAuthChallenge` without depending on `@dxos/client`. Synchronous, like `getSnapshot`, because every consumer attaches it inside a React effect or an identity-change callback; the signing it defers is the asynchronous part.

This replaces `createEdgeIdentity(client)` from `@dxos/client/edge` at every non-CLI call site: `plugin-client`'s hub HTTP client, `plugin-assistant`'s EDGE AI model resolver, `plugin-connector`'s coordinator, and `plugin-payments`.

**Breaking for `@dxos/plugin-payments` consumers:** `getEdgeAuthHeader`, `createEdgeAuthedFetch`, `buyPremium`, and `createStripeCheckout` now take an `Identity.EdgeIdentity` as their first argument instead of a `Client`. The package no longer depends on `@dxos/client` or `@dxos/react-client` at all.
