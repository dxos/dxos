---
name: subduction-policy
description: Reference for `SubductionPolicy` (the four hooks `authorizeConnect`, `authorizeFetch`, `authorizePut`, `filterAuthorizedFetch` passed via `Subduction.hydrate(..., policy)` or `new Repo({ subductionPolicy })`). Use when designing client-side access control over Subduction-replicated data, choosing which hook to deny in, or debugging why a doc did or did not replicate.
---

# `SubductionPolicy`: authoritative reference

`SubductionPolicy` is the JS-imported policy object the Subduction Wasm bridge consults for every authorization decision. The TypeScript shape (verbatim from `subduction_wasm/src/policy.rs`'s `TS_POLICY` block):

```ts
export interface Policy {
  authorizeConnect(peerId: PeerId): Promise<void>;
  authorizeFetch(peerId: PeerId, sedimentreeId: SedimentreeId): Promise<void>;
  authorizePut(requestor: PeerId, author: PeerId, sedimentreeId: SedimentreeId): Promise<void>;
  filterAuthorizedFetch(peerId: PeerId, ids: SedimentreeId[]): Promise<SedimentreeId[]>;
}
```

Convention: **resolving allows, throwing (or returning a rejected promise) denies**. All `peerId` arguments are subduction-level Ed25519 identities derived from the signer (`MemorySigner.peerId()` / `WebCryptoSigner.peerId()`), NOT automerge-repo's `PeerId` string.

This skill is the source of truth. It supersedes any older guidance that called `authorizeFetch` "server-side fetch-RPC only" or `filterAuthorizedFetch` "completely dead". Those were both wrong; see below for what they actually do.

## Where each hook is consulted

Verified against `inkandswitch/subduction@main` (`subduction_core/src/{subduction.rs,subduction/peers.rs,storage/powerbox.rs}`).

### `authorizeConnect(peerId)`

- **One call site**: `Subduction::add_connection` (`subduction.rs` ~line 840).
- Fires once per `addConnection` / `acceptTransport` / `connectTransport` call, i.e. once per handshake.
- Denial = the connection is rejected and never added. No subsequent hook fires for that peer until they reconnect.
- Cycling the underlying transport (e.g. `reconnectAdapters` in DXOS tests) drives a fresh handshake → fresh `authorizeConnect`.

**Use it when** you want a per-peer kill-switch ("never talk to this peer at all").
**Don't use it when** you want per-document gating — `authorizeConnect` is all-or-nothing for that peer.

### `authorizeFetch(peerId, sedimentreeId)`

- **One call site**: `StoragePowerbox::get_fetcher` (`storage/powerbox.rs`), invoked from `Subduction::send_requested_data` (`subduction.rs` ~line 2603), which is the single function used for sending sedimentree data to a peer.
- `send_requested_data` is called from THREE places, all inside the bidirectional batch-sync protocol (`subduction.rs` lines 1084, 1990, 2265). Every batch-sync round between two peers exchanges fingerprints, BOTH sides discover what the other is missing, BOTH sides call `send_requested_data` for the requested half.
- Therefore `authorizeFetch` fires on the holder for **every outbound data send**, including:
  - explicit fetch RPCs from the peer,
  - the connect-time `fullSyncWithAllPeers`,
  - any `syncWithAllPeers` (which is what `addBatch` triggers internally — see below for the "new commit" path which is different).
- Denial → that peer does not receive that sedimentree on that sync round. The peer sees `DataRequestRejected`; their entry transitions to a failed state and will only retry via heal-retry exponential backoff or a fresh connection.

**Use it when** you want **per-peer, per-sedimentree** control over what data leaves this node.
This is the only Policy hook that gates outbound serving of sedimentree contents to a connected peer.

### `authorizePut(requestor, author, sedimentreeId)`

- **One call site**: `StoragePowerbox::get_putter` (`storage/powerbox.rs`), invoked from inbound sync paths in `subduction.rs` (~lines 1914, 1953, 2201, 2240) and `subduction/ingest.rs` (~lines 93, 137). All inbound-data ingest paths.
- `requestor` is the **immediate sender** (the peer whose connection delivered the bytes).
- `author` is the **original signer** of the commit, recovered from `VerifiedAuthor` (`PeerId::from(*author.verifying_key())`). Empirically verified in the 3-peer chain test (`E1: requestor === immediate sender, author === original signer`).
- Denial → that specific commit/fragment is dropped. Logged in `subduction_core` as `WARN ... policy rejected ... policy denied`.
- **NOT called for the holder's OWN writes**: the local `add_commit` / `add_fragment` / `add_batch` paths use `local_putter` ("the node trusts itself — no policy check is performed"). So a permissive holder cannot use `authorizePut` to gate its own writes; that's by design.

**Use it when** you want to refuse inbound data:

- by immediate sender (per-peer): match on `requestor`.
- by original author (per-source, even through a relay): match on `author`.
- by document (per-sedimentree): match on `sedimentreeId`.

Combinations work, since you control the predicate.

### `filterAuthorizedFetch(peerId, ids)`

- **One call site**: `get_authorized_subscriber_conns` in `subduction/peers.rs`.
- Invoked when the holder broadcasts a NEW commit (`add_commit` calls `get_authorized_subscriber_conns` to decide who receives the `SyncMessage::LooseCommit` frame; `subduction.rs` ~lines 1207, 1311).
- **Critical caveat**: only called for peers that have explicitly **subscribed** to that sedimentree (i.e. issued a batch-sync request with `subscribe: true`). If a peer is connected but has not subscribed, the broadcast falls back to "send to all connections" with NO filter consultation. From `subduction.rs`:
  ```rust
  let subscriber_conns = self.get_authorized_subscriber_conns(id, &self_id).await;
  if subscriber_conns.is_empty() {
      // No subscribers for sedimentree, broadcasting to all connections
      self.all_connections().await
  } else {
      subscriber_conns
  }
  ```
- The wasm shim **intersects** the policy's response with the input list — a buggy policy that returns extra IDs cannot expand the authorized set.
- Empirically dead in many test setups because peers don't subscribe before the holder writes; the broadcast falls into the "no subscribers" branch.

**Use it when** you want to gate which subscribers receive proactive broadcasts of NEW local commits. Only meaningful if peers actually subscribe (`syncWithAllPeers(id, subscribe=true)` or `syncWithPeer(..., subscribe=true)`).
**Don't rely on it** for batch-sync flows (`fullSyncWithAllPeers`, `syncWithAllPeers(..., false)`); those go through `authorizeFetch` instead.

## Summary table

| Hook                    | Side consulted               | Triggers                                                                                                                       | Useful for                                        |
| ----------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `authorizeConnect`      | both (on `addConnection`)    | every handshake                                                                                                                | per-peer kill-switch                              |
| `authorizeFetch`        | holder (sender)              | every `send_requested_data` → every batch-sync round, including connect-time `fullSync` and post-`addBatch` `syncWithAllPeers` | per-peer × per-sedimentree outbound gate          |
| `authorizePut`          | receiver                     | every inbound commit/fragment; NOT the holder's own writes                                                                     | per-(requestor, author, sedimentree) inbound gate |
| `filterAuthorizedFetch` | holder, only for subscribers | proactive broadcast of NEW local commit when at least one peer is subscribed                                                   | per-subscriber broadcast gate                     |

## The "can the client gate replication purely client-side?" answer

YES. Two hooks, two directions:

- **Inbound gate (client refuses incoming data)**: `authorizePut`. Denial reliably drops the bytes regardless of whether they came in via proactive push or explicit fetch.
- **Outbound gate (client refuses to send its own data out)**: `authorizeFetch`. Denial reliably blocks `send_requested_data` from shipping the bytes during any batch-sync round.

`authorizeConnect` is the nuclear all-or-nothing option for refusing a peer entirely (cuts the channel in both directions).

The server side does NOT need to cooperate. A passive/permissive server is fine — the client can stop both inbound writes and outbound serving entirely on its own.

## Per-peer gating requires knowing the peer's Ed25519 id

`peerId` / `requestor` / `author` arguments are subduction-level Ed25519 identities, not automerge-repo string PeerIds. To gate per-peer you need the peer's signer public key out-of-band, e.g. by constructing peers with explicit `MemorySigner` instances and reading `signer.peerId().toString()`. In DXOS production code where the edge DO mints its own signer at startup, the client does not currently know the DO's subduction peer-id — that mapping has to be plumbed through (e.g. captured at handshake on `EdgeSubductionReplicatorConnection`).

## Recovery after denial → allow

Subduction has a single documented fast-recovery escape hatch: `repo.shareConfigChanged()`. It "resets entries whose `lastSyncResult === 'all-failed'` to `null`, clears the heal-retry backoff, and triggers an immediate re-sync" (from `SubductionSource.shareConfigChanged()` in `@automerge/automerge-repo/dist/subduction/source.js`).

Empirically verified recovery behavior:

- **`authorizeFetch` deny → allow on the holder**: kick via `client.shareConfigChanged()` on the **fetcher** recovers immediately. (The fetcher is where the failed-RPC entry lives.) See `'shareConfigChanged() retries after subductionPolicy denial flips to allow'` in `packages/core/echo/echo-host/src/automerge/automerge-repo-subduction.test.ts`.
- **`authorizePut` deny → allow on the receiver**: `shareConfigChanged()` on either side does NOT recover. Cycling the transport via `reconnectAdapters` does NOT recover (per the SKILL doc's known fork gap, `lastSyncResult === 'all-failed'` is not retried on connection-generation bumps). The only reliable recovery is a **fresh commit on the holder** which enqueues a new outbound batch that sidesteps the stuck entry. See `F1: authorizePut deny → allow needs a fresh holder commit to recover`.

Production implication: when flipping a client-side `authorizePut` gate from deny → allow (e.g. authorizing a new space), drive a no-op commit on any doc you want to pull through.

## Mutating policy behavior at runtime

The `subductionPolicy` reference passed to `Repo` is captured at construction; there is no setter. Use closure-captured state inside hook bodies. The wasm bridge invokes the JS hook on every authorization decision, so changes to closure state are observed immediately for new requests.

## What changed from prior guidance

If you've read older internal docs claiming any of the following, they were wrong:

| Claim (old)                                                             | Reality (current)                                                                                                                            |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `authorizeFetch` only fires for explicit fetch RPCs, not proactive push | Fires on every batch-sync `send_requested_data`, which is the actual mechanism behind both proactive push and explicit fetch in this bridge. |
| `filterAuthorizedFetch` is completely dead                              | Dead for batch-sync flows. ALIVE for proactive `addCommit` broadcast — but only consulted for peers that have explicitly subscribed.         |
| The holder's own writes go through `authorizePut`                       | They go through `local_putter` which bypasses policy ("the node trusts itself").                                                             |
| The only way to gate outbound replication is server-side `authorizePut` | Client-side `authorizeFetch` also gates outbound — verified empirically and in the upstream source.                                          |

## Test suite

The empirical findings above are pinned by `packages/core/echo/echo-host/src/automerge/automerge-repo-subduction.test.ts` under `describe('subductionPolicy: characterizing client-only gates')` (Blocks A–H). Re-run the suite if you suspect bridge behavior has changed:

```sh
cd packages/core/echo/echo-host && pnpm vitest run src/automerge/automerge-repo-subduction.test.ts
```
