# echo-plain-objects — Tasks

_Resume: Phase 5 — a reviewer subagent is going over the full diff; fix confirmed findings, re-run the affected suite (and the bench if a hot-path line moves), then update the PR body to cover the optimization work. Stage C stays BLOCKED under constraint 3 (DESIGN.md D9) pending the user's choice. Uncommitted: none. Last: Phase 3b measured at `27735fbc` — automerge reads 133 ns, 12.7× from baseline._

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

### Follow-ups recorded, not in scope

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

## Phase 5: Compare and review

- [x] **Before/after table in `BENCHMARKS.md`** — `0dab2f81` → `27735fbc`, per cell; elision checks
      re-verified on every section.
- [ ] **Blast-radius follow-through** — anything outside `echo*` that broke or needed a shim,
      recorded with its resolution.
- [ ] **Reviewer pass** — round 1 done (six findings; stale-value audit of every mutation path came
      back clean). Fixed: absent keys are no longer cached (unbounded growth on a record probed with
      arbitrary keys); bound `ObjectCore.change`/`changeAt` bump the generation themselves, so a local
      write invalidates reads even if the entity manager no longer routes the change event to that core;
      the hit path does one `Map.get` instead of `has`+`get` (possible because `undefined` is never
      stored); four comments trimmed to one clause. Left as-is, with reason: (a) `isValidProxyTarget` now
      returns `false` for a revoked function proxy where it used to throw — strictly more robust, no
      caller depends on the throw; (b) the read rows measure only cache hits after Stage B and the feed
      read rows go through the typed handler — both true and both recorded (F2, BENCHMARKS.md), but a
      miss-path row cannot be built without a mutation per iteration, whose cost swamps the read, so
      it is recorded here as a follow-up rather than added. Re-run of all three suites and one bench
      pass pending; round 2 review after that.

### References

- Baseline bench and methodology: PR #12951.
- Sibling effort on the storage side: `.agents/projects/echo-storage-optimization/` (flush scoping,
  doc-ID checksum overhead) — different layer, same package; coordinate on `echo-client` changes.
