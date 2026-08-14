# Client Startup Timeout — Tasks

_Resume: Phase 0 RESOLVED 2026-08-14 — the "existing subduction patch" never
existed; the real fix is upstream `automerge/automerge-repo#712`, now ported
into our pinned `.40` dist patch and verified (commit/fragment re-persist on
boot is zero). Two follow-ons found: the same defect in a second cache
(`#lastRemoteHeads`, Phase 0), and idle index churn that is now the dominant
boot SQL cost (Phase 2b). Phase 3 is specced but not implemented._

Root cause, timeline, and measurements: DESIGN.md.

**Symptom:** worker boots in 3.1 s, then blocks its thread ~18 s on local
subduction hydration, misses the client's flat 15 s connect deadline, and the
two sides deadlock so no retry succeeds. System Error dialog on every load.
Scales with document count (~1,700 docs on the reporting profile).

## Phase 0: Confirm prior art — RESOLVED 2026-08-14

- [x] Locate the existing subduction patch. **It never existed** — every
      historical `automerge-repo` patch back to PR #10752 leaves the save path
      untouched. The false lead was PR #12064, which tests a plain `Repo` with
      no `initSubduction` and so never exercises `SubductionSource`.
- [x] Port the real fix (upstream `automerge/automerge-repo#712`) into the
      pinned `.40` dist patch — mirror the disk hash scan into `knownHashes`.
      Verified: commit/fragment re-persist on boot is now zero.
- [ ] Same defect, second cache: bulk-seed `#lastRemoteHeads` from one
      `remote-heads` prefix scan at source construction. Currently 515 writes
      against 0 reads of that family per boot, and ~93% are for documents that
      never attach — so the per-attach replay cannot cover them.
- [ ] Decide on the deferred leads: rebase the dist patch `.40` → `.47`, and
      land the `automerge-subduction` 0.16.1 bump from
      `origin/claude/sweet-goldberg-twtikd`.

## Phase 1: Make the failure recoverable

Highest value per unit of risk — turns a fatal startup into a merely slow one,
and is independent of any hydration work.

- [ ] Fresh clientId per connect attempt in `Client.Connection` (`#clientId` is
      currently readonly, set once per Connection).
- [ ] `onConnect` cleans up on failure — release the tab liveness lock, close
      the services proxy and bridge server. Today a timed-out `onConnect` runs
      to completion in the background and leaks all three.
- [ ] Worker replaces rather than ignores a `start-session` for a clientId
      already in `tabsProcessed`.
- [ ] Regression test: worker that blocks past the connect deadline must still
      converge on a working session via retry.

## Phase 2: Cut the hydration cost

- [ ] Collapse `listCommitIds` + `listFragmentIds` per entry into one prefix
      scan per space. Today: 1,703 docs × 2 key families = 3,406 distinct
      `loadRange` calls, observed 5,962 times as compaction re-lists.
- [ ] Batch the chunk inserts (`saveBatch` already has a
      `TODO(dmaretskyi): replace with one batched write`).
- [ ] Yield to the event loop between batches — wa-sqlite is synchronous
      in-process, so nothing else on the worker thread runs during a scan.
- [ ] Re-measure against the same profile: target the stall well under the
      connect deadline.

## Phase 2b: Idle index churn — 79% of boot SQL time

Measured in `oo7c99`: 68 index passes, **all reporting zero work**, costing 272
`indexCursor` reads (245.0 ms) + 136 full-table `automerge_heads` scans
(131.2 ms). Rate is flat at ~4/s and continues after all replication stops.
Details and call paths: DESIGN.md §"Idle index churn".

- [ ] Find what schedules the passes. Not the `done === false` re-entry (every
      pass reports `done: true`) and not replication (rate is flat through
      seconds with zero subduction/feed messages). Remaining candidates:
      `documentsSaved`, `feedStore.onNewBlocks`.
- [ ] Reconcile with the `memory-usage` project's "Phase 4 idle churn (~51 SQL/s
      from four loops)" — likely the same loop; fix once.
- [x] Hoist the source read out of the per-index loop — DONE. Cursors are
      per-index so `getChangedObjects` itself cannot be shared, but its expensive
      part (the `automerge_heads` full scan) is cursor-independent, so it is now
      captured once per pass. Cursor reads are also batched into one statement
      per source. Measured on a real boot: `indexCursor` 4 → **2** per run and
      `automerge_heads` 2 → **1** per run, with the batched query returning
      2024 rows (1012 docs × 2 indexes), confirming the partition.
- [x] Instrument why each run fires — DONE. The completion line now carries
      `reasons` (a multiset, since `DeferredTask` coalesces), `durationMs`, and
      `invalidates`. First capture answers Phase 2b's open question:
      `{"rpc-update-indexes":1}` with `invalidates: false`, i.e. the **tab drives
      indexing over RPC** and a zero-work run does _not_ re-invalidate — so the
      loop is not self-sustaining through invalidation. Needs a fully-loaded
      session to confirm the ~4/s cadence.
- [ ] Cache document heads across passes in `AutomergeDataSource` (invalidated on
      `documentsSaved`) — the pass-scoped snapshot above only shares within one
      pass. Deliberately not done: a longer-lived cache is only safe if
      `documentsSaved` is the sole path by which heads change, which is unverified
      and would silently drop index updates if wrong.
- [ ] Replace the O(N) scan + JS diff with an anti-join against `indexCursor`
      carrying a real `LIMIT` — the current `break` after `limit` saves nothing
      because the SQL is unbounded.

## Phase 3: Defer network activity behind the handshake

Spec: DESIGN.md §"Spec: begin network activity only after boot". **Deferred to a
follow-up PR** — implemented once and reverted to keep this PR scoped; the
working diff is preserved at
`.agents/projects/client-startup-timeout/defer-networking.patch` (edge-client `deferConnect` +
`startNetworking()`, host-owned 300 ms delay, worker-runtime anchor, feed-syncer
eager-poll gate). Re-apply rather than re-deriving.

Verified while implementing: only the edge dial needs an explicit gate.
Subduction already returns early while the socket is not `CONNECTED`
([echo-edge-subduction-replicator.ts:265](../../../packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts))
and resumes from `_handleReconnect`; feed sync re-schedules its poll/push from
`onReconnected`. The one leak is `FeedSyncer._open`'s unconditional initial
`pollTask.schedule()`, which parks on the send-ready trigger until the socket
appears — hence the gate in the saved patch.

Also note `EdgeConnection` is implemented twice — `EdgeClient` and
`TestEdgeConnection` (`packages/core/mesh/messaging/src/testing/test-edge-mesh.ts`)
— so adding an interface member breaks `messaging:build` until the double is
updated.

- [ ] Add a worker-runtime-owned `bootGate`, resolved after the session
      handshake completes; bind it to the runtime's lifetime so a second tab
      against a warm worker is not gated again.
- [ ] Await it in every outbound initiator: subduction connection managers
      (`SubductionConnections.manageConnection`, `AdapterConnections.addAdapter`),
      the edge WebSocket connect, and feed sync's first pull. Local hydration is
      explicitly out of scope (Phase 2 owns that).
- [ ] Bound it: resolve on the earlier of handshake-complete or a ~5 s ceiling,
      and unconditionally on handshake _failure_ so a broken tab cannot leave
      the worker offline. Log which arm fired.
- [ ] Verify against a single-`i` fresh-boot `app.log`: first
      `received subduction batch` / edge-connect strictly after
      `worker-session opened`.
- [ ] Confirm the edge WebSocket connect is no longer starved (it landed at
      24.231 only because the thread freed at 23.707), and measure
      handshake→first-batch to show no time-to-first-sync regression.

## Phase 4: Independent cleanups

- [ ] Gate the SQLite query log and its `performance.measure` behind a flag —
      42.3 MB of a 44.1 MB capture, 22.3 MB of it blob params serialized as
      `{"0":133,"1":111,…}`. Lands separately from the above.
- [ ] Split `LOCK_OR_RPC_WAIT_TIMEOUT` — one flat 15 s currently covers both
      Web Lock acquisition and worker RPC response; those want different
      budgets.

## Notes

- Workaround for a stuck tab: open a second tab. It gets a fresh clientId
  against a now-warm worker and connects immediately. Also a cheap confirmation
  of the diagnosis.
- Diagnosis came from a user-captured NDJSON log, not a bisect — no commit has
  been identified as the regression point. The "grows with space size" claim is
  inferred from the per-document query pattern plus the user's report; not
  tested against a second profile.
