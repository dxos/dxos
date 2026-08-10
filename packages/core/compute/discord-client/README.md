# @dxos/discord-client

Minimal Effect-native client for the five Discord REST endpoints DXOS actually calls:

| Endpoint                        | Used for                        |
| ------------------------------- | ------------------------------- |
| `/users/@me`                    | identity of the connected token |
| `/users/@me/guilds`             | guild list                      |
| `/guilds/{id}/channels`         | channel enumeration             |
| `/guilds/{id}/threads/active`   | active threads                  |
| `/channels/{id}/messages`       | message sync + backfill         |

Responses are schema-decoded, and Discord's `{ code, message }` error envelope is preserved on the
failure channel so `Missing Access` stays diagnosable rather than collapsing to a status code.
Rate limiting honours `retry_after` on the request that hit the limit — DXOS issues Discord traffic
in short, low-concurrency bursts, so no shared bucket store is needed.

Consumers: `plugin-discord` (connector, sync, channel listing) and the assistant-toolkit Discord
skill.

## Why this exists, and when it should go away

It replaced [`dfx`](https://www.npmjs.com/package/dfx) during the Effect 4 migration, on the premise
that dfx had no Effect 4 release and was holding an `effect@3` install in the tree — two Effect
instances share no runtime, so every Discord path was type-degraded and would have failed at
layer-provision time.

**That premise was wrong.** `dfx@1.0.0` shipped 2026-02-20 peering `effect >=4.0.0-beta.101`, six
months before this package was written; `dxos/edge` runs `dfx@1.0.15` against Effect 4 today. Only
the `0.113.x` line DXOS was pinned to peers `effect@3`, and a version bump would have cleared the
two-runtime problem without new code.

So the honest reason to keep this package is narrower than the reason it was created:

- It has **no dependencies**. dfx pulls `discord-api-types`, whose `.mjs` wrappers re-export a
  CJS bundle member by member; under vite/vitest every binding resolves to `undefined` unless the
  bundler is specifically configured for it (see `vitest.shared.ts` in `dxos/edge`, which needs a
  resolver plugin for exactly this).
- It covers five endpoints in ~400 lines, versus dfx's full gateway + REST surface.

Neither is a strong argument against dfx. **Prefer deleting this package and depending on `dfx@1.x`
if** the Discord surface grows past a handful of endpoints, gateway/websocket support is needed, or
maintaining the schemas here starts costing more than the interop configuration would. Nothing here
is load-bearing enough to defend on its own.
