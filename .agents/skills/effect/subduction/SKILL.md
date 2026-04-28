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
neither initiates the handshake and `findWithProgress` never transitions to `ready`.

In `AutomergeHost`, both client and edge peers use `role: 'connect'`. Symmetric `connect`
works for client↔edge as well as peer-to-peer (mesh replicator, test networks). Do not
change either side to `accept` without also guaranteeing the counterparty stays `connect`.

## `shareConfig` / `sharePolicy` are NOT consulted by subduction

Classical automerge-repo gates announcement and access via `Repo({ shareConfig })`
(or the legacy `sharePolicy`), and the
[`DocSynchronizer.resolveSharePolicy`](../../../node_modules/.pnpm/@automerge+automerge-repo@2.6.0-subduction.10/node_modules/@automerge/automerge-repo/src/synchronizer/DocSynchronizer.ts)
hook calls them.

**Subduction's `SubductionSource` does not.** Empirically, with two repos connected only
via `subductionAdapters`:

- `shareConfig.announce` returning `false` on both sides → doc still replicates.
- `shareConfig.access` returning `false` on both sides → doc still replicates.
- Legacy `sharePolicy: async () => false` on both sides → doc still replicates.
- `shareConfig.announce` throwing → doc still replicates; the error never reaches the subduction path.

Implication: **never use `shareConfig` to gate subduction-era replication.** It only
restricts what `networkSubsystem.send` advertises through classical sync messages — which,
under our `network: []` config, have no transport anyway.

## How to gate subduction replication

Use `Repo({ subductionPolicy })` instead. The
[`Policy`](../../../node_modules/.pnpm/@automerge+automerge-subduction@0.7.0/node_modules/@automerge/automerge-subduction/dist/index.d.ts)
interface from `@automerge/automerge-subduction` exposes:

- `authorizeConnect(peerId)` — gate the initial handshake.
- `authorizeFetch(peerId, sedimentreeId)` — gate reads of a specific sedimentree.
- `authorizePut(requestor, author, sedimentreeId)` — gate writes.
- `filterAuthorizedFetch(...)` — narrow what a peer is allowed to pull.

There is **no `authorizeAdvertise` hook**. `AutomergeHost._subductionPolicy` (currently
all-permissive) is the place to add real access control; see the long comment in
[`automerge-host.ts`](../../../packages/core/echo/echo-pipeline/src/automerge/automerge-host.ts)
about the missing advertise hook before tightening this — over-restricting `authorizeFetch`
without an advertise hook can break legitimate replication.

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
