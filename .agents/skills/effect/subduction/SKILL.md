---
name: subduction
description: >-
  Guide for Subduction (the sedimentree-based document byte transport in
  `@automerge/automerge-subduction` / `@automerge/automerge-repo`'s
  `subductionAdapters`). Use when wiring `Repo({ subductionAdapters, subductionPolicy })`,
  picking adapter `role`, debugging why two peers don't sync over subduction,
  or implementing access control for subduction replication.
---

# Subduction

Subduction is the document byte transport that runs alongside (or in place of) classical
automerge-repo `network` adapters. In this codebase it is wired by
[`AutomergeHost`](../../../packages/core/echo/echo-pipeline/src/automerge/automerge-host.ts)
via `Repo({ subductionAdapters, subductionPolicy })`. The findings below are characterized
empirically; treat them as load-bearing constraints when changing wiring.

## Adapter `role` matrix

Each entry in `subductionAdapters` carries `role: 'connect' | 'accept'`. The role decides
which side initiates the subduction handshake on top of an already-connected
`NetworkAdapter`.

| roleA     | roleB     | Result             |
| --------- | --------- | ------------------ |
| `connect` | `connect` | syncs              |
| `connect` | `accept`  | syncs              |
| `accept`  | `connect` | syncs              |
| `accept`  | `accept`  | deadlock — no sync |

Rule: **at least one peer must be `connect`**. Two `accept` peers are both responders, so
neither initiates the handshake and `findWithProgress` does not transition to `'ready'`
within a 1.5 s observation window
([test](../../../packages/core/echo/echo-pipeline/src/automerge/automerge-repo-subduction.test.ts)
`describe('role matrix') > 'accept/accept does not sync'`). The test is a strong empirical
observation; it does not prove the fork can never recover via a future heal-retry —
if it ever does, that test will catch the change.

In `AutomergeHost`, both client and edge peers use `role: 'connect'`. Symmetric `connect`
works for client↔edge as well as peer-to-peer (mesh replicator, test networks). Do not
change either side to `accept` without also guaranteeing the counterparty stays `connect`.

## `shareConfig` / `sharePolicy` are NOT consulted by subduction

Classical automerge-repo gates announcement and access via `Repo({ shareConfig })`
(or the legacy `sharePolicy`), and the
`DocSynchronizer.resolveSharePolicy` hook calls them.

**Subduction's `SubductionSource` does not.** Empirically, with two repos connected only
via `subductionAdapters`
([test](../../../packages/core/echo/echo-pipeline/src/automerge/automerge-repo-subduction.test.ts)
`'share config does not gate subduction replication'`):

- `shareConfig.announce` returning `false` on both sides → doc still replicates.
- `shareConfig.access` returning `false` on both sides → doc still replicates.
- Legacy `sharePolicy: async () => false` on both sides → doc still replicates.
- `shareConfig.announce` throwing → doc still replicates; the error never reaches the subduction path.

Implication: **never use `shareConfig` to gate subduction-era replication.** It only
restricts what `networkSubsystem.send` advertises through classical sync messages — which,
under our `network: []` config, have no transport anyway.

## How to gate subduction replication

Use `Repo({ subductionPolicy })` instead. The
[`Policy`](../../../node_modules/.pnpm/@automerge+automerge-subduction@0.11.0/node_modules/@automerge/automerge-subduction/dist/index.d.ts)
interface from `@automerge/automerge-subduction` exposes four hooks. The table below
records what each hook actually gates under the current
`@automerge/automerge-repo@2.6.0-subduction.17` bridge wiring, characterized empirically
in
[`packages/core/echo/echo-pipeline/src/automerge/automerge-repo-subduction.test.ts`](../../../packages/core/echo/echo-pipeline/src/automerge/automerge-repo-subduction.test.ts)
(`describe('subductionPolicy gates')`).

| Hook                               | Side consulted | Effective?                                                                                                                                                                |
| ---------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authorizeConnect(peerId)`         | per peer       | Yes. Denial on either side blocks the subduction handshake; `findWithProgress` does not reach `'ready'`. (Tested with denial on the client; symmetric behavior expected.) |
| `authorizeFetch(peer, treeId)`     | server         | Yes, but only for explicit fetch requests (see below).                                                                                                                    |
| `authorizePut(req, author, tree)`  | receiver       | Yes. Denial drops inbound commits with `policy denied` warnings in `subduction_core`.                                                                                     |
| `filterAuthorizedFetch(peer, ids)` | server         | Bypassed by proactive push (see below).                                                                                                                                   |

### `authorizeFetch` is server-side, fetch-only

`authorizeFetch` is consulted on the SERVER when a peer asks us to fetch a specific
sedimentree — i.e. when WE serve a fetch RPC. It is **not** consulted on the client side
("am I allowed to fetch?") and it is **not** consulted on either side of a proactive push.

If your goal is to block a peer from receiving a sedimentree, denying `authorizeFetch`
on the server works only if replication actually requires that peer to issue a fetch.
In the common case where both peers connect and the holder pushes proactively (see next
section), `authorizeFetch` is never hit and the doc still arrives.

### `filterAuthorizedFetch` is bypassed by proactive push

The bridge replicates documents by PUSHING from the holder to connected peers at
connection time and on every `#save` — not by waiting for the peer to fetch. That push
path does NOT consult `filterAuthorizedFetch` (which is a fetch-response filter, not a
push-advertise filter). Empirically, with a host-side `filterAuthorizedFetch` returning
only an allowed-doc id, both the allowed AND blocked docs reach `'ready'` on the client.

This matches the long-standing note that **there is no `authorizeAdvertise` hook**.
`filterAuthorizedFetch` is essentially dead under this bridge.

### Practical recipe

To actually block peer P from receiving sedimentree S:

1. Deny `authorizePut(P, _, S)` on the receiver — blocks pushes.
2. Deny `authorizeFetch(P, S)` on the server — blocks fetches if P falls back to fetching.
3. Optionally also `authorizeConnect(P)` — blocks the handshake outright if you want to
   refuse the peer entirely rather than per-document.

`AutomergeHost._subductionPolicy` is currently all-permissive and is the place to add
real access control; the long comment in
[`automerge-host.ts`](../../../packages/core/echo/echo-pipeline/src/automerge/automerge-host.ts)
flags the missing advertise hook before tightening this.

### Mutating policy at runtime

The `subductionPolicy` reference passed to `new Repo({ subductionPolicy })` is captured at
construction. There is no setter to swap it later. To change behavior dynamically, install
a policy whose async hook bodies consult external state (closure variables, atomics,
etc.) — Rust subduction calls back into JS on every authorization decision, so observable
behavior changes immediately for new requests.

After flipping the gate from deny to allow, **call `repo.shareConfigChanged()`**. This is
the documented escape hatch:

- `SubductionSource.shareConfigChanged()` resets entries whose `lastSyncResult ===
"all-failed"` to `null`, clears the heal-retry backoff, and triggers an immediate
  re-sync.
- Without this kick, recovery is left to the heal scheduler (exponential 100→200→...→6400
  ms backoff), so the sync gap can be many seconds.

See the test
[`shareConfigChanged() retries after subductionPolicy denial flips to allow`](../../../packages/core/echo/echo-pipeline/src/automerge/automerge-repo-subduction.test.ts).

## Reconnect recovery: `'all-failed'` is not retried on connection change

Known fork gap. `SubductionSource.#recomputeEntry` (in
`@automerge/automerge-repo/dist/subduction/source.js`) only re-syncs in the `running`
state when one of these holds:

- `entry.lastSyncResult === null` (a save just landed and bumped it), OR
- `entry.lastSyncResult === "no-peers"` AND `lastSyncGeneration !== connectionGeneration()`.

Notably, `entry.lastSyncResult === "all-failed"` is NOT retried on a connection-generation
bump. Recovery is left entirely to the heal scheduler, whose exponential backoff
(default 100→200→400→800→...→6400 ms) takes 10+ s to retry — and empirically the heal
rounds on a freshly-reconnected transport exchange heads frames without delivering
the offline commits, suggesting stale subduction-core peer state from the torn-down
transport.

Concrete failure mode: peers connect, sync, drop the line (e.g. underlying transport
gates send), make an offline write, restore the line via `peerDisconnected` +
`peerCandidate`. The offline write does NOT propagate within a reasonable wall clock.
See the `.todo` test
[`recovering from a lost connection`](../../../packages/core/echo/echo-pipeline/src/automerge/automerge-repo-subduction.test.ts)
for the precise diagnosis and a suggested fix in `#recomputeEntry`.

Suggested fork fix: treat `lastSyncResult === "all-failed"` the same as `"no-peers"` for
the connection-generation re-sync trigger. A connection-generation change means the prior
failure was on a now-dead peer set and is worth retrying immediately.

## Mental model

```
                Repo
        ┌────────┴────────────┐
        │                     │
  classical sync          subduction
  (network adapters)      (subductionAdapters)
        │                     │
  shareConfig /          subductionPolicy
  sharePolicy            (Policy interface)
```

Two policy layers, two transports. They do **not** cross-bridge. If you change one,
explicitly reason about whether the other needs the matching change.

## Where things live

- Wiring: [`packages/core/echo/echo-pipeline/src/automerge/automerge-host.ts`](../../../packages/core/echo/echo-pipeline/src/automerge/automerge-host.ts)
  (`_subductionPolicy`, `subductionAdapters`, `SUBDUCTION_SERVICE_NAME`).
- Upstream `Policy` types: `@automerge/automerge-subduction` package `dist/index.d.ts`.
- Upstream adapter contract: `@automerge/automerge-repo/src/subduction/AdapterConnections.ts`,
  `ConnectionManager.ts`, `NetworkAdapter.ts`.
