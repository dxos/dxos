---
'@dxos/protocols': minor
'@dxos/plugin-connector': minor
---

Connect a Cloudflare account to Composer. The new Cloudflare connector runs Cloudflare's OAuth flow through EDGE and stores the grant under the `cloudflare.com` source, so anything resolving credentials through `CredentialsService` can call the Cloudflare v4 API on the user's behalf. The grant covers the deploy path — Workers scripts, bindings, routes, tail and observability, KV, R2, D1, Queues, Pipelines, Vectorize, Hyperdrive, Secrets Store, Workers AI and Containers — with only the identity reads required, so a user can decline whatever they do not use. Picking a connector that needs no credentials now starts its OAuth flow immediately instead of asking for a second confirmation.
