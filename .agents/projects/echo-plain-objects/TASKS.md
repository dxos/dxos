# echo-plain-objects — Tasks

_Resume: Stage D is complete and measured — reads 24-26 ns across all three kinds, wide automerge write 449 → 254 µs. Stage E is ABANDONED (DESIGN.md D12; four of five premises falsified). Next is Phase 8: preserve ref identity across the refresh, then narrow the remote refresh by the patch paths, with premises A1-A5 under adversarial review first. Stage C stays BLOCKED under constraint 3 (DESIGN.md D9). Uncommitted: `echo-client-e2e/src/sync-refresh.test.ts`, a failing-before test for Phase 8 held back until it ships with its fix. Last: Stage E abandoned at `9c55516b`._

Design and decisions: [DESIGN.md](./DESIGN.md). Numbers: [`echo-client-e2e/BENCHMARKS.md`](../../../packages/core/echo/echo-client-e2e/BENCHMARKS.md).

## Phase 0: Baseline

Anchor every number to a commit before touching the implementation, so the comparison at the end is
against a recorded run of the same bench on the same machine class, not a memory of one.

### Tasks

- [x] **Land the benchmark** — `property-access.bench.ts` in `echo-client-e2e` (PR #12951): reads,
      writes, batched writes and construction across plain / unpersisted / automerge / feed, narrow and
      250-field wide, with the anti-elision guards and the per-row drain that keeps teardown inside the
      30s RPC budget.
- [x] **Record the baseline** — `BENCHMARKS.md` at `0dab2f81`, per-op costs derived as
      `(mean(x10) − mean(x1)) / 9`.

## Phase 1: Scope

Understand exactly what the `get` trap does per read, how persisted objects learn about document
changes, and everything that depends on the object being a `Proxy`, before deciding the shape of the
replacement.

### Tasks

- [x] **Proxy core report** — DESIGN.md F1. Dominant avoidable cost is a per-read descriptor
      allocation plus primitive boxing; the Proxy is load-bearing for identity across `db.add` (handler
      swap).
- [x] **Persisted read path report** — DESIGN.md F2. The 1.7 µs is the document read with no value
      cache; every mutation funnels synchronously through `core.notifyUpdate()`, so a generation-stamped
      leaf cache is correct by construction.
- [x] **Blast radius report** — DESIGN.md F3. Three blueprint assertions (`writable: true`, `in`
      before/after, `defineProperty` notification) pin Proxy semantics and exclude Stage C under
      constraint 3.
- [x] **Settle the design** — D1–D9. Staged: A (trap fast path) and B (leaf cache) proceed; C blocked
      pending the user relaxing constraint 3 for the named tests.

## Constraints

No API changes · no on-disk format changes · **tests are not updated** — the existing suites are the
contract and must pass as they stand. See DESIGN.md §Constraints for how this shaped the design (own
accessor properties whose setter throws today's exact error; `Obj.update` passes the same object to its
callback).

## Phase 2 — Stage A: fast path in the existing `get` trap

The proxy-core report (DESIGN.md F1) found that ~80–140 ns of the 250 ns read is a per-read
`getOwnPropertyDescriptor` allocation that only matters for Type entities, plus boxing every primitive to
probe a symbol. Removing both is a pure fast path — same result per read, less work — and stays under
all three constraints without design. Ships regardless of Stage C.

### Tasks

- [x] **Skip the descriptor lookup** — simpler than the flag: read the value first, return non-objects
      outright, consult the descriptor only for values that would be wrapped. Exact reordering.
- [x] **Don't box primitives** — `typeof` before the `symbolIsProxy` probe in `isValidProxyTarget`.
- [x] **Green: `echo` tests, unmodified** — 34 files, 581 passed, 9 skipped.
- [x] **Measure** — `f42c3714` in `BENCHMARKS.md`. Unpersisted/feed reads 2.3× (297 → 130 ns), not the
      ~3.5× predicted; writes 1.3–1.4×, `Obj.make` 1.5×. Automerge reads moved 1.6× but the diff is not
      on that path — recorded as unattributed, to be bounded by the Stage B repeat run.

## Phase 3 — Stage B: automerge reads from a per-object leaf cache

Confirmed by the persisted-path report (DESIGN.md F2): the 1.7 µs is the document read — four
allocations and a 5-level prototype walk per access, no value cache anywhere — and every mutation reaches
the object synchronously through `core.notifyUpdate()`. So a per-target cache of decoded primitive
leaves, invalidated by a generation counter bumped in `notifyUpdate`, is correct by construction.
Independent of Stage C; the Proxy stays.

### Tasks

- [x] **Confirm the cost is the doc read** — F2.
- [x] **Generation counter on `ObjectCore`** — `generation`, incremented in `notifyUpdate()` before the
      emit; nothing else.
- [x] **Leaf cache on the target's instance state** — `symbolLeafCache` installed by
      `createInstanceState`; checked in `EchoReactiveHandler.get`; populated only when the wrapped result
      is a primitive. Records, arrays and refs untouched.
- [x] **Read-after-write inside `Obj.update`** — covered by the existing suites (every `set` reaches
      `notifyUpdate` synchronously, F2).
- [x] **Green: `echo-client` and `echo-client-e2e` tests, unmodified** — 549 and 324 passed.
- [x] **Measure** — `63cc39ab` in `BENCHMARKS.md`, two passes. Automerge reads 1.06 µs → 464 ns (2.3×),
      but 4× above unpersisted, not next to it as predicted.

## Phase 3b — the trap prelude

The Stage B miss: a tight-loop profile (F4) put the cache hit at 218 ns against 77 ns for the typed
handler, and the difference was everything `get` did _before_ consulting the cache — an `invariant`
whose build-time call-site record allocates on every read, a symbol `switch`, and an `instanceof` walk.
Checking the cache first is safe (F4 says why) and took the hit to 85 ns.

### Tasks

- [x] **Profile the hit path** — F4. 49% self time in `get` itself, 23% in the caller, 11% in the
      handler slot; the cache lookups are not where the time is.
- [x] **`invariant` behind the check** — the allocated record moves to the failing branch. 218 → 201 ns.
- [x] **Cache check first** — ahead of the `invariant`, the symbol `switch` and `instanceof EchoArray`;
      arrays carry no cache and the internal accessors are symbols, so nothing is bypassed. 201 → 85 ns.
- [x] **Green: `echo-client` and `echo-client-e2e` tests, unmodified** — 549 and 324 passed.
- [x] **Measure** — `27735fbc` in `BENCHMARKS.md`. Automerge reads 464 → 133 ns (3.5×), within ~25 ns of
      unpersisted (105 ns); 12.7× against the baseline.

## Phase 3c — materialized record (user direction: "materialize into a ready-to-use object")

Replaces the leaf cache (DESIGN.md D10). Each record target decodes its record once per core generation
into `MaterializedRecord { decoded, values }`; `get` serves `values[prop]`, the key-set traps serve
`decoded`. Rebuild is lazy on the first trap after the generation moved, for the reason in D10.

### Tasks

- [x] **`MaterializedRecord` on the instance state** — `symbolMaterialized`, installed by
      `createInstanceState`, one generation behind so the first trap builds it.
- [x] **`_materialize`** — one `getDecoded` of the record; `values` holds every key the system surface
      does not answer, wrapped once through `_wrapInProxyIfRequired`.
- [x] **`ownKeys` / `has` / `getOwnPropertyDescriptor` read `decoded`** — one decode per generation
      instead of per call; arrays keep the fresh decode.
- [x] **Green: `echo-client` and `echo-client-e2e` tests, unmodified** — 549 and 324 passed, after the
      `hasDoc` guard (D10): the first run failed `circular references`, a read inside `createObject`
      before the core had a document.
- [x] **Measure** — in `BENCHMARKS.md`. Automerge reads 129 / 116 ns, parity with 3b as expected.
- [x] **Review round 2** — over the materialized record. No stale or wrong value found on any mutation
      path. Confirmed cost regression: whole-record deep decode plus eager child wrapping made a read
      after a write O(subtree) and the `Obj.update` write/read interleave quadratic; a nested record
      target duplicated its subtree. Fixed by holding the document's own record object (`core.getRaw`, no
      copy) and filling `values` lazily per key — D10 "Revised". Also fixed: two stale comments
      (`object-core.ts` generation, `ref.ts` per-access refs); `getOwnPropertyDescriptor` returns the
      `id` descriptor before materializing. Left as-is, with reason: an evicted core (removed from the
      entity manager) keeps serving its last values instead of re-reading a document it no longer
      tracks — the object is already removed from the directory, and bound local writes still
      self-invalidate; the meta-root `createdAt`/`updatedAt` shadowing the reviewer raised cannot occur
      under lazy fill, since the virtual branch answers before the decode path stores anything.
- [x] **Green: both suites, unmodified, on the lazy form** — 549 and 324 passed.
- [x] **Measure** — `b3486ba0` in `BENCHMARKS.md`. Automerge reads 113 / 111 ns; 15× / 16.5× from baseline.

### Follow-ups recorded, not in scope

- Arrays (`EchoArray` targets) still decode per index; the same materialization applies.
- A nested record target's `decoded` duplicates the subtree the root's `decoded` already holds; a
  materialization that slices from the parent would remove the O(depth) duplication.
- Each assignment inside one `Obj.update` is a separate Automerge commit; batching into one
  `core.change` is the real write win.
- `ownKeys`/`has` decode the whole record per key → `Object.keys(obj)` is O(n²).
- A new `RefImpl` is allocated per ref read.

## Phase 4 — Stage C: de-proxy closed-struct instances — BLOCKED

**Blocked by constraint 3** (DESIGN.md D9): `reactive-proxy.blueprint-test.ts:343` asserts
`writable: true`, `:263-272` asserts `in` is false before first assignment, `:332` asserts one
notification from `defineProperty` — no non-Proxy shape satisfies them, and `echo-panproto/lens/live.ts`
throws over a non-extensible base. **Waiting on the user:** accept A+B as the deliverable, or relax
constraint 3 for those specific tests (and the lens) to unlock this phase. The tasks below are the plan
if unblocked; DESIGN.md §Proposal, scoped by D3/D6/D7.

### Tasks (if unblocked)

- [ ] **Accessor-backed object for closed structs** — `Object.prototype`-rooted; one own enumerable
      accessor per field over a re-pointable store slot; setter checks `isInChangeContext` and throws
      today's error verbatim; `preventExtensions`.
- [ ] **Shared getter/setter functions** — one memoized pair per field name (monomorphic). Verify with
      the bench.
- [ ] **Pre-declared metadata slots** — every symbol written outside `update` today (`ParentId`,
      `EchoOwner`, `StaticTypeSchemaSlot`, `ObjectDeletedId`, …) exists as a writable own
      non-enumerable prop from creation, so `preventExtensions` never blocks the system's own writes.
- [ ] **`Obj.update` passes the same object** — already true today (F1); confirm nothing else assumes
      a proxy in the callback.
- [ ] **Store swap on `db.add`** — the persisted handler re-points the store slot instead of swapping a
      proxy handler; identity preserved.
- [ ] **`subscribe` / `getRawTarget` / `updateFrom` / `Text.*`** — the load-bearing `isProxy` sites in
      F1 accept the new shape.
- [ ] **D2 residual** — from the blast-radius count: does any test assert the custom message for a
      _new_ key on a closed struct? Decide `preventExtensions` accordingly.
- [ ] **Green: `echo`, `echo-client`, `echo-client-e2e` tests, unmodified.**
- [ ] **Measure** — rerun, record. Expect ~10 ns.

## Phase 4b — query materialization bench (user direction)

`query-materialization.bench.ts`: 1,000 narrow / 100 wide objects, peer reload before every cold sample,
query all, one read per result; baseline vs head columns in `BENCHMARKS.md`.

### Tasks

- [x] **Write the bench** — cold rows inclusive of the reload (vitest passes no per-iteration hooks to
      tinybench), in-row phase timings reported from `afterAll`, short results re-run and counted.
- [x] **Product limits found** — 1,000 wide objects cannot be cold-queried (2 s per-object load budget,
      20 s index-query ceiling surfaced as an unhandled rejection); cold loads slow down across reloads in
      one process. Recorded in `BENCHMARKS.md`; not in scope to fix.
- [x] **Baseline column** — `0dab2f81` sources checked out in place, rebuilt, measured, restored. Loading
      unchanged; first read per object ~2 µs both ways; repeat reads 4–5× cheaper on head.

## Phase 6 — Stage D: trap-less reads, write-through (DESIGN.md D11)

The `Proxy` stays for `set`/`delete`/`defineProperty`; the `get` trap goes; the target holds the data and
is kept current at write time and in `notifyUpdate`. Automerge-backed objects first, typed handler second,
both benches after each.

### Tasks

- [x] **Surveys** — proxy-identity consumers; automerge write and construction paths; typed-handler
      nested values and raw readers (three Explore reports, folded into DESIGN.md F6–F8).
- [x] **Proxy identity off the `get` trap** — `4a92e276` + `71296056` (registry on `globalThis`); `echo`
      suite green.
- [x] **D1 — automerge: fill at construction, write through on `set`/`delete`, refresh in
      `notifyUpdate`** — `25239b3c`. Fill in `init` once the core has a document _and_ a database (a ref
      minted before the database is known has no resolver); the refresh hook also runs after a write to a
      bound document, closing the routing gap both reviews flagged. `MaterializedRecord` and `generation`
      removed.
- [x] **D1 — internals as prototype accessors** — the first four were already prototype-backed (F6); the
      meta root got `EchoMetaRoot` for `createdAt`/`updatedAt` and is now cached in `targetsMap` so a held
      meta proxy is refreshed. `has`/`ownKeys`/`getOwnPropertyDescriptor` read the document record.
- [x] **D1 — drop `get` for automerge record proxies** — `ProxyHandlerSlot.forwardReads`, gated on
      `ReactiveHandler.readsForwarded`. All three suites green unmodified. Benches at `25239b3c`:
      automerge reads 113 → **26 ns** (5× a plain read, from 249× at baseline); the per-object first read
      after a cold query fell 2.5 ms → 0.1 ms per 1,000 objects with no measurable cost added to the
      query.
- [x] **D2 — typed handler: nested values stored wrapped; raw readers unwrap; drop `get`** — `1b03141f`.
      Also made trap removal reversible: `db.add` swaps the handler on the same slot, so `setHandler`
      restores the trap and the incoming handler opts back in (two `echo-client` failures found this).
      All three suites green. Benches: unpersisted 75 → **20 ns**, feed 79 → **24 ns**; all three storage
      kinds now read at the same 20-27 ns.
- [x] **Shorten the bench windows** — 300 ms per access row, 120 ms per `make` row, 3 cold query samples,
      so a full run of either file is under a minute; the per-op means stay comparable, the rme widens.
- [x] **One shared handler — not done, and the goal is met another way.** Reads no longer reach the slot
      at all (no `get` trap), so the delegation that remains is on `set`/`delete`/`defineProperty` and the
      key-set traps, which are genuinely kind-specific and cost nothing against a µs write. The slot is
      also what lets `db.add` swap a handler while keeping object identity — load-bearing, as the D2 bug
      showed. Recorded as a deliberate non-change.
- [x] **Reviewer pass over Stage D** — 12 findings. Fixed: the whole-record double refresh on every write
      (a measured 360 → 476 µs wide-write regression, now **254 µs**); nested `Text` deltas being schema-
      validated per keystroke through a sub-proxy; a throw during refresh escaping `notifyUpdate`'s error
      guard and stranding targets; own getters invoked while wrapping; the dead meta-root branch; both
      casts. Accepted with reasons in DESIGN.md D11: eager container materialization (measured, D10's cost
      argument does not hold), and `isProxy` no longer seeing through a foreign wrapping proxy (affects
      only the lens, which the user released).
- [ ] **PR body updated with the Stage D column.**

## Phase 7 — Stage E: one read-only handler, a mutable view inside `Obj.update` (abandoned)

- [x] **Adversarial pass on the premises** — four of five falsified; see DESIGN.md D12 for each verdict
      and its evidence. `clone.test.ts` goes red under premise 1; premise 3 is contradicted by 84
      zero-argument `Obj.update` call sites; premise 4 would turn the `Ref.make` guard into a silent
      deep copy. Stage E is dropped rather than reshaped — what remains of it (arrays holding their
      elements) is a smaller, separate change, and the pass surfaced a live defect that matters more.
- [x] **Abandoned, with the direction it produced recorded** (D12).

## Phase 8 — Stage F: fix the refresh (identity, then granularity)

The defect the adversarial pass surfaced. The refresh is O(document) per incoming change and re-mints ref
identity — `_materializeValue → lookupRef` builds a fresh `RefImpl` and `RefResolver` per ref key on every
unscoped refresh, so `holder.assignee !== holder.assignee` across one. And `_writeThrough`'s key narrowing
is wired only for the local-write path: on the remote path `getInlineAndLinkChanges` keeps the object id
out of `patch.path[1]` and discards the rest, so `_emitObjectUpdateEvent` can only ask for a full refresh.
Predicted symptom of both together: re-render storms under sync in ref-heavy, array-heavy spaces — a
workload neither bench covers, so it needs its own measurement.

Premises A1–A5 (ref reuse is observationally equivalent, URI equality is a sufficient key, patch paths
carry what a target must react to, path-intersecting targets are sufficient, `_emitObjectUpdateEvent` is
the only caller needing narrowing) are with an adversarial agent; the tasks below are provisional on its
verdicts.

### Tasks

- [x] **Adversarial pass on A1–A5** — A1 survives conditionally, A2 survives, A3/A4/A5 falsified. (B) is
      not merely wasteful but wrong: a remote `list.splice(0, 1)` emits one patch naming `list[0]`, while
      the targets for `list[1]` and `list[2]` both need refreshing, so path narrowing silently corrupts
      them. Verdicts and evidence in DESIGN.md D13.
- [x] **Prove the defect first** — `echo-client-e2e/src/sync-refresh.test.ts`, three tests over two
      clients on one peer so the change arrives the way a synced one does. "A ref the change did not
      touch keeps its identity" is red at HEAD (`Object.is` on two `Ref(echo:///01M1VN73…)`); the other
      two pass, which is what makes the first one a defect rather than a design gap.
- [x] **Memoize the raw record** in `_refreshRecord`, keyed on the `docHandle` it came from — an
      unchanged record is one pointer compare, and an unchanged key keeps its materialized value. This
      replaces both (A) and (B): ref identity falls out of it, and no patch plumbing is needed.
- [x] **Green: `echo` 581, `echo-client` 549, `echo-client-e2e` 327** (including the three new), all
      unmodified.
- [ ] **Measure** — the property-access matrix, to show reads and writes are unmoved.
- [ ] **Record the run in `BENCHMARKS.md`** under this commit.

## Phase 5: Compare and review

- [x] **Before/after table in `BENCHMARKS.md`** — `0dab2f81` → `b3486ba0`, per cell; elision checks
      re-verified on every section.
- [ ] **Blast-radius follow-through** — anything outside `echo*` that broke or needed a shim,
      recorded with its resolution.
- [x] **Reviewer pass** — round 1 (six findings; stale-value audit of every mutation path came
      back clean). Fixed: absent keys are no longer cached (unbounded growth on a record probed with
      arbitrary keys); bound `ObjectCore.change`/`changeAt` bump the generation themselves, so a local
      write invalidates reads even if the entity manager no longer routes the change event to that core;
      the hit path does one `Map.get` instead of `has`+`get` (possible because `undefined` is never
      stored); four comments trimmed to one clause. Left as-is, with reason: (a) `isValidProxyTarget` now
      returns `false` for a revoked function proxy where it used to throw — strictly more robust, no
      caller depends on the throw; (b) the read rows measure only cache hits after Stage B and the feed
      read rows go through the typed handler — both true and both recorded (F2, BENCHMARKS.md), but a
      miss-path row cannot be built without a mutation per iteration, whose cost swamps the read, so
      it is recorded here as a follow-up rather than added. Round 2 is under Phase 3c.

### References

- Baseline bench and methodology: PR #12951.
- Sibling effort on the storage side: `.agents/projects/echo-storage-optimization/` (flush scoping,
  doc-ID checksum overhead) — different layer, same package; coordinate on `echo-client` changes.
