# Client Startup Timeout — Tasks

_Resume: diagnosis complete from the user's NDJSON log; nothing implemented yet.
Blocked on one question — where the "existing subduction patch" for unnecessary
startup writes lives (Phase 0). Uncommitted: this project scaffold._

Root cause, timeline, and measurements: DESIGN.md.

**Symptom:** worker boots in 3.1 s, then blocks its thread ~18 s on local
subduction hydration, misses the client's flat 15 s connect deadline, and the
two sides deadlock so no retry succeeds. System Error dialog on every load.
Scales with document count (~1,700 docs on the reporting profile).

## Phase 0: Confirm prior art — blocked on user

- [ ] Locate the existing subduction patch that mitigates unnecessary startup
      writes. Searched and not found: both files in `patches/`, `git log --all`,
      `SqliteStorageAdapter.save()`, upstream `2.6.0-subduction.47`. See
      DESIGN.md §Open question. Need a PR number, branch, or file path.
- [ ] Once located, re-check the captured log against it — does it apply to the
      read path (2,650 reads in the stall window) or only writes (478)?
- [ ] Decide on the two leads: rebase the 556-line dist patch `.40` → `.47`, and
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

## Phase 3: Defer hydration behind the handshake

- [ ] Worker answers the tab's session handshake before subduction hydration
      starts; hydration and sync proceed behind a live session.
- [ ] Confirm the edge WebSocket connect is no longer starved (it landed at
      24.231 only because the thread freed at 23.707).

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
