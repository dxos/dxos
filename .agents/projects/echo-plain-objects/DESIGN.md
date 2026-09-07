# echo-plain-objects — Design

## Problem

Every read of a field on an ECHO object goes through a JS `Proxy` `get` trap. Measured in
`echo-client-e2e/property-access.bench.ts` at `0dab2f81` (per-op, harness floor cancelled):

| single-field read | narrow (2 fields) | wide (250 fields) |
| ----------------- | ----------------: | ----------------: |
| plain object      |            6.8 ns |           12.0 ns |
| echo unpersisted  |            297 ns |            258 ns |
| echo automerge    |           1.69 µs |           1.83 µs |
| echo feed         |            271 ns |            264 ns |

Two facts shape the design:

1. **The cost is per access, not per object.** Width is free — a 250-field object reads at the same
   speed as a 2-field one for every kind. Whatever the trap does, it does it on each `get`, and it does
   not scale with the object.
2. **Objects are already immutable outside `Obj.update`.** A direct assignment on an initialized object
   throws (`typed-handler.ts:271`). So the `set` trap's job on the read path is purely to _refuse_ —
   which a non-writable data property does for free, at the engine level, with no trap at all.

The proxy therefore buys nothing on reads that a plain object with read-only properties would not
also provide. The ~30× (unpersisted) and ~240× (automerge) read tax is the price of a mechanism whose
only read-side purpose is enforcement the object shape can carry itself.

## Constraints (from the user, 2026-09-05)

1. **No API changes.** `Obj.make`, `Obj.update`, `Obj.subscribe`, `db.add`, queries — same signatures,
   same observable semantics.
2. **No on-disk format changes.** Automerge document shape and feed block encoding are untouched.
3. **Tests are not updated.** The existing suites are the behavioural contract; the change must pass
   them as they stand. This is the constraint that shapes the design below — it rules out any
   representation whose failure mode differs from today's in message or type.

Process: once implemented, a reviewer subagent goes over the diff and the code is iterated until it is
clean. **Every load-bearing assumption is put to an adversarial agent before it is built on** (user,
2026-09-06) — one told to falsify the premise and to prove counterexamples with throwaway tests, not to
confirm it. Adopted after a justification for keeping the `get` trap on some proxies turned out to be
wrong in three of its four cases, none of which had been checked.

## Proposal

The read path loses the `Proxy`; every other observable behaviour is kept by moving the enforcement the
`set` trap did today onto the object's own property descriptors.

- `Obj.make` / `db.add` / query results return an object that is **non-extensible** and carries one
  **own, enumerable accessor property per schema field**. The getter reads a backing store slot; the
  setter checks the **existing** change-context flag (`isInChangeContext`) and either writes the slot
  or throws **the same `Error` with the same message** the trap throws today. Object identity is stable
  for life, as today.
- `Obj.update(obj, cb)` opens the change context and calls `cb(obj)` — **the same object**, not a
  proxy. Nothing else is needed: the setters already admit writes inside the context. On return the
  single batched notification fires exactly as now. (The brief allowed a mutable proxy here; passing
  the object itself is stricter under constraint 1 and needs no second view.)
- **Arrays** are a context-gated `Array` subclass: element reads are native, mutating methods check the
  flag and throw the current error outside `Obj.update`. **Nested objects** get the same accessor
  treatment recursively.
- For **persisted** objects the backing store is a **materialized snapshot** of the document. The
  system refreshes the slots in place whenever the document changes — local `Obj.update` or remote
  sync — so the getter never touches the document on a read.

Why accessors and not read-only data properties: a non-writable data property rejects a write with the
engine's own `TypeError: Cannot assign to read only property`, and silently drops it in sloppy mode.
That is a different error, a different message, and a different sloppy-mode behaviour from today —
constraint 3 forbids all three. A setter can throw exactly what the trap throws.

Why own accessors and not a shared prototype: accessors on a prototype are invisible to `Object.keys`,
spread, `JSON.stringify` and `Object.entries`, all of which route through the proxy's `ownKeys` trap
today and enumerate the fields. Own enumerable accessors keep that behaviour. The getter and setter
_functions_ are still shared — one pair per field name, memoized — so every instance's accessor for
`value` is the same function object and the call site stays monomorphic and inlineable.

## Decisions

_Open items are marked; each is recorded with its reasoning once made._

### D1 — Persisted objects: refresh in place, or re-materialize?

**Decided: refresh in place.** Re-materializing a fresh object per change would change identity on
every remote edit, breaking every consumer holding a reference — the current proxy preserves identity
for life and that is load-bearing (React state, query results, refs), and it would also be an API change
under constraint 1. In-place slot updates keep identity and keep the read path a plain load. The cost is
a second copy of each persisted object's fields (the doc holds one; the snapshot holds another); today
the proxy reads through to the doc and holds none. Memory impact to be measured in Phase 3.

### D2 — What does a direct assignment do outside `Obj.update`?

**Decided by constraint 3: exactly what it does today.** The accessor setter throws the same `Error`
with the same message. _Open residual:_ assigning a **new, non-schema** property outside the context
would hit `preventExtensions` and throw the engine's `TypeError: Cannot add property …`, not the custom
message. Whether any test asserts the custom message for that specific case is a blast-radius question;
if one does, the object stays extensible and unknown-key writes are caught another way.

### D3 — Nested objects and arrays

**Decided: nested records de-proxy with their root; arrays stay proxied.** Nested records become own
accessor-backed properties (identity is then trivially stable — F1). Arrays cannot: `arr[i] = v` on a
plain array is uninterceptable, and tests assert that index assignment outside `Obj.update` throws the
custom error. `Object.freeze` gives a `TypeError` with a different message and is irreversible, so it
would also need a fresh array inside `update` — an identity change. The `ReactiveArray` proxy stays
exactly as today; a record field holding an array holds the same proxy it holds now. Array element reads
keep the trap cost; Stage A's fast path applies to them too, since index keys go through the same trap.

### D6 — Open records stay proxied

`Schema.StructWithRest` / `Record` schemas (e.g. `TestSchema.Expando`) have a dynamic key set. Only a
trap can gate a write to a key that does not exist yet, and `preventExtensions` would forbid adding keys
_inside_ `Obj.update`, which those schemas allow. Stage C applies to **closed structs only** — the
production shape — and dispatches on the schema at `Obj.make`. Open records keep today's path
unchanged.

### D7 — Type entities stay proxied

Type entities go through the same `makeObject` and rely on the `set` trap to invalidate the memoized
`StaticTypeSchemaSlot` when `Type.addFields` mutates `jsonSchema`. They are not on any hot path. Left as
is.

### D9 — Stage C is blocked by constraint 3 (tests unchanged)

**Decided: not under the current constraints.** Three assertions in
`echo-client/src/echo-handler/reactive-proxy.blueprint-test.ts` — run twice, in-memory and db — pin
Proxy semantics specifically, and no non-Proxy representation can satisfy them:

- `:343` `getOwnPropertyDescriptor(obj, 'x').writable === true`. Only a `set` trap can refuse a write
  while the descriptor reports writable; a non-writable data property fails the assertion and an accessor
  has no `writable` at all.
- `:263-272` `'number' in obj` is `false` before first assignment and `true` after. Accessors require
  pre-defined keys (breaks the `false`); an undefined key cannot be gated without a trap (breaks the
  guarantee).
- `:332` `Object.defineProperty(obj, …)` inside `Obj.update` expects exactly one notification.
  Descriptors cannot intercept `defineProperty`.

Also `echo-panproto/src/lens/live.ts:112` wraps a live object in a second Proxy whose `ownKeys`/`has`/
`getOwnPropertyDescriptor` synthesize keys; over a non-extensible target those violate Proxy invariants
and throw. Unblocking C means changing those tests and the lens — a relaxation of constraint 3 the user
has not granted. Until then the Proposal above is a design on file, not a plan.

### D10 — Materialize the record, not the leaf (user direction, 2026-09-05)

**Decided: each record target materializes its whole record from the document once per core
generation; the per-key leaf cache is replaced.** The user asked for a ready-to-use object rebuilt when
the document changes rather than a decode-on-read with a cache. `getDecoded` deep-copies the subtree it
is asked for (`decode` rebuilds every nested object with `Object.fromEntries`), so decoding per key was
paying for the record's shape anyway; decoding it once and keeping the result makes `ownKeys`, `has`
and `getOwnPropertyDescriptor` — which each decoded the whole record per call, so `Object.keys(obj)` was
O(n²) — one decode per generation as well.

Shape: `MaterializedRecord { generation, decoded, values }` on the instance state. `decoded` is the
record exactly as `getDecoded` returns it, used by the key-set traps so their answers are unchanged.
`values` is a null-prototype object of what `get` returns — primitives, the stable nested proxies from
`targetsMap`, resolved refs — for every document key the system surface does not answer
(`Reflect.has(target, key)` false at build time). `get` reads `values[prop]` first; `undefined` means
"not here" and falls through to today's path, so a key the record could not hold (a seeded own property
still shadowing during `createObject`) is still answered correctly, only without the fast path.

Rebuild is lazy, on the first trap after the generation moved, not eager in the `notifyUpdate`
subscription: eager would decode the whole record on every `set`, so an `Obj.update` with ten sets on a
250-field object would rebuild it ten times before anything reads, and the write rows would regress. The
generation counter is the subscription reduced to an integer; the lazy rebuild reads it. If a consumer
turns out to read one field after every change on a wide object, lazy costs it a whole-record decode per
change where the leaf cache cost one key — recorded as a trade-off, not a defect.

One guard the leaf cache never needed: materialization touches the document, and inside `createObject`
a read can arrive before `initNewObject` has given the core one (the `circular references` test: building
`task` creates `another`, whose `createRef` reads `task.id` while `task` is mid-construction — the seeded
own property answered it before, `getDoc` threw now). `_materialize` returns without building while
`core.hasDoc` is false, leaving the generation behind so the next trap retries; `get` then falls through
to the own property exactly as before.

**Revised after review round 2: the record is held, not decoded, and the values fill lazily.** The
first cut decoded the whole record on the first trap after a change and wrapped every child eagerly.
The reviewer showed the cost model that creates: a scalar read after a write went from one key's decode
to a deep decode of the subtree, so the write/read interleave an `Obj.update` callback routinely does
(`for (k of keys) d[k] = d[k] + 1`) became quadratic in record width, and reading `doc.title` after
every keystroke into a large `content` string re-copied the string; eager wrapping also created a proxy
target for every nested child on the first read of any field. So `MaterializedRecord` now holds
**`raw`** — the document's own record object, taken by `core.getRaw` with no copy, which is safe because
an Automerge document is immutable and a change produces a new one — for `ownKeys`/`has`/
`getOwnPropertyDescriptor`, and **`values`** starts empty at each generation and is filled by `get` on
the decode path, one key per first read. Resetting at a change is O(1). The key-set traps read `raw`
with `Object.keys`/`Object.hasOwn` rather than `Reflect.*`, because the document object carries
symbol-keyed Automerge metadata a decoded copy never had; the descriptor is built explicitly (the
document is frozen, and the assertion at `reactive-proxy.blueprint-test.ts:343` needs `writable: true`).
Arrays keep the fresh decode on those traps, byte for byte.

This is the leaf cache generalized — wrapped children and refs are held too, and the key set is served
from the document object — rather than the eager snapshot first asked for. The eager form is recorded
here as considered and rejected on the reviewer's cost argument; if the user wants it regardless, it is
`_materialize` walking `raw` once.

Refs are now materialized: one `Ref` per generation instead of one per read. This is a semantic change
the leaf cache deliberately avoided (F2); the suites decide whether anything depends on per-read
identity, and none did.

### D11 — Stage D: keep the `Proxy`, drop the `get` trap, write through (user direction, 2026-09-06)

**Decided.** The object stays a `Proxy`, because only a `Proxy` can make `delete`, `defineProperty`, a
write to an existing field and a write to a new key all throw the ECHO error outside `Obj.update` while
keeping `Object.keys` exact (D9, F5). What changes:

- **No `get` trap.** The target holds the record's current values as own data properties — primitives,
  nested records as their sub-proxies, arrays as their array proxies, refs as `Ref` objects — so the
  engine forwards every read to the target with no JavaScript call (F5: ~16 ns for the shape, against
  ~100 ns for today's trap). `a.b.c` is three forwarded reads; each nested record is its own trap-less
  proxy over its own filled target.
- **One handler, no slot delegation.** A single shared handler with `set`, `deleteProperty` and
  `defineProperty`: outside a change context each throws the ECHO error; inside, it calls the write logic
  for the object's kind, found off the target's prototype chain. `has`, `ownKeys`,
  `getOwnPropertyDescriptor`, `getPrototypeOf` stay as traps where today's answers differ from the
  target's (the root's `id`, the hidden instance-state prototype); none is on the read path. Proxy
  identity (`isProxy`, `getProxyTarget`) moves off the `get` trap onto a `WeakMap` keyed by proxy.
- **Write-through, not a generation counter.** The target is kept current at write time: the `set` trap
  writes the document and the target's property together, O(1) per set, so a write/read loop inside
  `Obj.update` never rebuilds; `ObjectCore.notifyUpdate()` — the one funnel every other mutation passes
  through synchronously (F2, confirmed by both reviews) — refreshes the root target and each nested target
  already materialized from the document, shallow, once per incoming change; the target is filled at
  construction, so the first read costs what every later read costs. The generation counter, the
  materialized-record slot, the lazy fill and the trap re-arming from D10 are all removed.
- **Symbol-keyed internals become prototype accessors.** What the `get` trap's `switch` served
  (`symbolInternals`, `SchemaId`, `TypeEntityId`, `devtoolsFormatter`) and the meta root's virtual
  `createdAt`/`updatedAt` move to accessors on the behaviour prototypes, so a forwarded read finds them.

**Refresh granularity, after the Stage D review (2026-09-06).** The first cut refreshed the object's whole
record on every write, and twice — the trap called the refresh explicitly and the synchronous change event
routed back and called it again — so a one-field write on a 250-field object re-materialized 500 keys, and
the wide automerge write regressed 360 → 476 µs. `ObjectCore.changeTargetKey` now scopes a write to the
key it touches and the refresh updates that key alone. Two constraints the tests established:

- **Narrowed, not deferred.** Deferring the refresh until after the write was tried first and is wrong: a
  subscriber is notified synchronously _inside_ the write, so an update applied afterwards is invisible to
  it (`subscription.test.ts`, "latest value is available in subscription").
- **Leaf writes only.** Replacing a nested record leaves the target already built for the old value —
  and everything materialized under it — holding what the container replaced, so a write whose
  materialized value is a proxy falls back to refreshing the record (`mutable-schema.test.ts`).

**Eager container materialization is accepted here, reversing D10's argument, because it was measured.**
D10 rejected eager filling on cost; the query bench then measured it: filling at construction left the
cold query unchanged (3.93 → 3.92 s, inside a ±36% rme dominated by the document load) while the first read
of 1,000 objects fell 2.5 ms → 0.1 ms. The residual risk D10 named is real but unmeasured — a deep stored
tree is walked and proxied at load, and the recursion is bounded only by document depth.

Order: automerge-backed objects (`EchoReactiveHandler`) first, then the in-memory typed handler, whose
nested values must be stored on the target already wrapped. Both benches run after each, and the query
bench's "construct" phase is where the fill-at-construction cost shows. Tests unchanged; the lens in
`echo-panproto` may change (user, 2026-09-06).

### D12 — Stage E abandoned; fix the refresh instead (adversarial pass 2026-09-06, user direction)

**Decided.** Four of Stage E's five premises were put to an adversarial agent and falsified. Stage E is
dropped; the work goes to the refresh path it would have widened.

- **P1, fill unconditionally — falsified with a red test.** `clone.ts:cloneInner` creates the proxy with
  no database and an empty `linkCache`, then copies the document in via `coreClone.change(...)`, which
  triggers the refresh; every ref freezes as a `RefImpl` with no resolver
  (`invariant violation: Resolver is not set [this.#resolver] at ref.ts:553`, `clone.test.ts` "clone with
  nested objects"). `edit-history.ts:169` is the same shape, latent. `lookupRef`'s non-database branch
  asserts `linkCache`, which `saveRefs` clears on `db.add`. The database half of `_canMaterialize` is
  load-bearing.
- **P2, arrays hold their elements — survives with five conditions.** Spread, `JSON.stringify`,
  `Object.keys`, `Array.isArray`, species and `instanceof Array` all survive, because `EchoArray`
  declares `static get [Symbol.species]()`. But `arr.constructor` drifts `Array` → `EchoArray`; `has`,
  `ownKeys` and `getOwnPropertyDescriptor` must stay trapped (`_arrayHas` answers `'-1' in arr` as
  `true`; a raw `EchoArray` has 9 own keys against the trap's 4, so internals would leak); and the
  refresh half — the expensive half — is unwritten, since arrays skip both `_refreshAll` and
  `_writeThrough` and their mutators open no `changeTargetKey` scope.
- **P3, `Obj.update` may pass a different proxy — falsified.** 84 call sites pass no callback argument
  and write through the outer read-side proxy, `reactive-proxy.blueprint-test.ts:332` among them. A
  mutable root view does not cover them: nested records, arrays and meta come from the shared
  `targetsMap`, and a second `Proxy` over one of those targets fails `isProxy`, degrading
  `Obj.subscribe` on it to a no-op.
- **P4, one shared read-only handler — falsified, and not by a test.** The read surface genuinely
  differs (`getOwnPropertyDescriptor(obj,'id')` carries no `value` for a db-backed object;
  `Reflect.ownKeys` is 6 against 4). Merging the classes destroys the only discriminator:
  `isEchoObjectField` would report `true` for a detached typed root, so `_handleLinksAssignment` would
  deep-copy by value instead of throwing "Object references must be wrapped with `Ref.make`".

**What the pass found instead, and what is now being built.** The refresh is O(document) per incoming
change **and re-mints ref identity**: `_materializeValue → lookupRef` builds a fresh `RefImpl` plus
`RefResolver` per ref key on every unscoped refresh, so `holder.assignee !== holder.assignee` across
one. `_writeThrough`'s key narrowing is the right idea and is wired only for the local-write path; the
remote path throws its information away — `getInlineAndLinkChanges` keeps `patch.path[1]`, the object
id, and discards the rest of the path, so `_emitObjectUpdateEvent` can only ask for a full refresh. So:
(A) preserve ref identity across a refresh when the stored URI is unchanged, and (B) thread the changed
paths from `event.patches` through to `_refreshAll` and refresh only the targets they touch.

### D13 — Stage F: memoize the raw record, do not thread the patches (adversarial pass 2026-09-06)

**Decided.** The plan D12 set out was (A) preserve ref identity across a refresh and (B) thread
`event.patches` into `_refreshAll` so only the targets a change touches are refreshed. Premises A1–A5
went to an adversarial agent. (A) survives and (B) is dead; both are replaced by a memo on the raw
record, which is strictly better and much smaller.

- **A1, reusing a `RefImpl` for an unchanged URI — survives, conditionally.** `RefImpl` memoizes
  nothing: `get target` and `load()` call the resolver on every access, so a held instance and a fresh
  one are observationally identical across mutation and deletion of the pointed-to object. The one
  branch that pins a target (`lookupRef`'s `linkCache` path) is unreachable from a refresh, because
  `_canMaterialize` and `lookupRef` branch on the same `getEchoDatabase(core)`. Nothing relies on the
  identity changing: `RefImpl` hashes by URI and `ref.atom` is an `Atom.family`, so two instances of one
  URI yield the identical atom — today's churn buys a wasted `useMemo` recompute, not a re-render.
  **Condition: the reuse must stay behind `_canMaterialize`.** If that gate is ever relaxed (Stage E's
  falsified P1), a `linkCache`-pinned target becomes reusable and does go stale.
- **A3/A4, patch paths are sufficient — falsified, and the failure is data corruption.** A remote
  `list.splice(0, 1)` emits exactly one patch, `del [objects, id, data, list, 0]`. The targets already
  handed out for `list[1]` and `list[2]` must both be refreshed — their values shifted — and neither
  path prefixes nor extends the patch path. Under path-intersection narrowing they are skipped and keep
  the old values permanently. Every index-shifting operation has this shape (`splice`, `shift`,
  `unshift`, `sort`, `reverse`, `length =`). Widening any patch under an array to the whole array
  subtree re-derives the memo below, with more code. Two lesser falsifiers: a string write emits a
  `splice` path carrying a character index _below_ the key, and creation/removal emit
  `path.length === 2`, where there is no namespace segment to match on at all.
- **A5, `_emitObjectUpdateEvent` is the only caller needing narrowing — falsified.**
  `bindCoreToBranch`'s own listener is a second remote-originated caller, equally unscoped, live
  whenever a `db.branch()` binding is open. And the local side is worse than assumed: only `set` and
  `deleteProperty` open a `changeTargetKey` scope, so every array mutator, `textUpdate`/`textSplice`,
  `_setRaw` and every external `getDocAccessor().handle.change` caller runs a full unscoped refresh —
  including the CodeMirror↔automerge binding, once per keystroke.

**What replaces both.** Automerge shares untouched subtrees structurally, and this holds for a change
delivered over the replication network, not merely a local one. So `_refreshRecord` memoizes the raw
record it last filled from: an unchanged record is the identical object and the refresh is one pointer
compare; within a changed record, a key whose raw value is identical keeps the value already
materialized for it. That is where (A) comes from for free — the encoded-reference map keeps identity,
so the `Ref` built from it is reused rather than re-minted. Measured on a 41 + 41 + 40-key object, one
remote key change: **`_materializeValue` 246 → 3**. It needs no plumbing, it is correct on the array
case that falsifies (B), it covers every caller in the A5 list at once rather than the remote one only,
and it makes the long-standing double refresh (`ObjectCore.change` refreshes eagerly and the routed-back
change event refreshes again) collapse into a second pointer compare.

**The one trap.** Raw-record identity is meaningful only within one document. `switchBranch` and
`_rebindMemberToBranch` re-point a live core at a different document, so the memo is keyed on the
`docHandle` it was taken from; without that guard three branching tests fail with the core serving the
previous branch's values.

### D14 — Stage E, revisited and built (user direction 2026-09-07)

**Decided.** D12 dropped Stage E as falsified. That was wrong on the merits, not merely overstated, and
the user pushed back on it: none of the four verdicts named a constraint, only the state of the code.
Re-examined premise by premise, and built.

- **P1 was a symptom, not a constraint.** `clone` failed because `lookupRef` captured whatever the core
  held at mint time — the database's resolver, or a target pinned out of the link cache — and both
  arrive _after_ the values are built. `CoreRefResolver` decides per call instead, so filling before a
  database exists is safe and the database half of `_canMaterialize` is gone. A URI naming no entity
  still gets no resolver, since `isAvailable` reports the resolver it was given.
- **P2 was real work, and cost two of its five conditions.** Arrays now fill like records. `constructor`
  is pinned to `Array` on `EchoArray.prototype`, as `_arrayGet` used to report; `_storedRecord` reads
  the whole meta namespace decoded, not just its root, or a nested meta target read raw loses the
  bare-tag-id to ref upgrade. `has`/`ownKeys`/`getOwnPropertyDescriptor` stayed trapped, which was never
  a problem: only `get` had to go.
- **P3 does not arise.** It falsified handing the callback a _different_ proxy — an optional convenience.
  The context-keyed write gate stays, so all 84 zero-argument `Obj.update` call sites are untouched.
- **P4 attacked the wrong design.** It falsified merging the two handler _classes_, which would destroy
  the `isEchoObjectField` discriminator and turn the `Ref.make` guard into a silent deep copy. What was
  needed was one shared _dispatching_ handler; `EchoReactiveHandler` and `TypedReactiveHandler` remain
  distinct classes and the discriminator is untouched.

**The one real invariant, and why the slot existed.** A `Proxy`'s trap lookup is told nothing about which
proxy is being operated on, so trap _presence_ is a property of the handler object. While any target
needed a `get` trap, handler objects had to be per-proxy — that, and nothing else, is what
`ProxyHandlerSlot` was for. Once every target carries its own data, no target needs one, and a single
`REACTIVE_PROXY_HANDLER` serves everything: ten traps dispatching to the handler the target carries.
`db.add` converts by rewriting that (`setProxyHandler`) rather than mutating a slot, so identity
survives as before. Removed with it: `forwardReads`/`readsForwarded` and the per-proxy trap surgery,
both handlers' now-unreachable `get` traps and `_arrayGet`, `getProxySlot`, and `dangerouslySetProxyId`.

**A bug introduced and caught inside the change, worth keeping.** The first dispatch was
`handler?.trap?.(...) ?? Reflect.trap(...)`. That is wrong for the two traps with a legitimate nullish
answer — `getOwnPropertyDescriptor` for a missing property, `getPrototypeOf` for a null prototype —
which would have silently fallen back to the default. It dispatches on the handler _defining_ the trap.

**Not measured.** See BENCHMARKS.md at `2e35502a`: the control rows swing −44% to +116% within one run,
so the bench cannot resolve this change either way. Stage E's case is the deletion — net −159 lines and
one less object allocated per proxy — not a number.

### D8 — Stage A is a pure fast path, not a redesign

In `TypedReactiveHandler.get`: (1) track per target whether any own **string-keyed accessor** exists
(true only for Type entities; maintained in `init` and the `defineProperty` trap) and skip the
`getOwnPropertyDescriptor` allocation when it does not; (2) in `isValidProxyTarget`, return early for
non-object, non-function values before touching `symbolIsProxy`, so primitives are never boxed; (3) when
no accessor exists, load `target[prop]` directly rather than `Reflect.get` with a foreign receiver. The
observable result of every read is identical; only the work to produce it changes.

### D4 — Migration order

Unpersisted first (Phase 2), persisted second (Phase 3). Unpersisted objects need no refresh path, so
they isolate the representation change from the synchronization change, and they give a before/after
read number after the smallest possible diff.

### D5 — Expected read cost

An own accessor with a shared, monomorphic getter inlines to a few nanoseconds in V8 — expect single-
field reads in the ~5–15 ns range against today's 250 ns (unpersisted) and 1.7 µs (automerge), i.e.
within 2–3× of the plain-object floor rather than 40–250× above it. This is a prediction to be checked
against the bench, not a result.

## Non-goals

- Changing `Obj.update`'s public signature or semantics. Callers see the same API. (Constraint 1.)
- Changing anything persisted: document shape, feed encoding, migration. (Constraint 2.)
- Touching the storage layer (flush scoping, doc-ID checksums) — that is
  `echo-storage-optimization`.
- Making persisted _writes_ faster. The automerge write at ~400µs is dominated by the automerge
  `change` itself (transaction `T`≈46–65µs vs set `S`≈340–405µs per the batched rows), which this
  design does not touch.

## Staged plan

The proxy-core findings below split the work into three stages of rising risk, each measurable and
committable on its own. Numbers are predictions until the bench says otherwise.

| stage | change                                                                                                    | keeps Proxy?   | expected read   | risk                                      |
| ----- | --------------------------------------------------------------------------------------------------------- | -------------- | --------------- | ----------------------------------------- |
| **A** | fast path in `TypedReactiveHandler.get`: skip the per-read descriptor allocation and the primitive boxing | yes            | 250 → ~70 ns    | none — pure fast path, no semantic change |
| **B** | automerge handler serves decoded leaves from a generation-stamped per-target cache (F2, F4)               | yes            | 1.7 µs → ~70 ns | low — invalidation is one funnel (F2)     |
| **C** | closed-struct instances become accessor-backed plain objects (this doc's Proposal), scoped per D3/D6/D7   | no (for those) | ~70 → ~10 ns    | **blocked under constraint 3 — see D9**   |

A ships regardless. B is independent of C. C is excluded by three existing tests (F3) and waits on a
decision to relax constraint 3 for them; until then the Proxy stays and the residual trap floor
(~30–70 ns against a 7 ns plain read) is the cost of that constraint.

## Findings

### F1 — Proxy core (`internal/common/proxy/`, report 2026-09-05)

**Object layout.** `Obj.make` → `makeObject` → `createReactiveObject` → `prepareTypedTarget` (one-time
`Schema.asserts`, arrays → `ReactiveArray`, `setSchemaProperties` stamps `TypeId`/`TypeEntityId`/`SchemaId`)
→ `createProxy` → `handler.init` (`EventId` on roots, `EchoOwner` on every nested record, then
`compactMetadataToInstanceState` moves every configurable symbol prop onto a `state` object inserted as
the target's prototype, chained to `TypedObjectPrototype`). The `getPrototypeOf` trap
(`typed-handler.ts:374`) then **lies** and reports `Object.prototype` — this is what lets `toEqual`,
`isPlainRecord`, `getSnapshot`'s recursion and `deepMapValues` treat the object as plain. Any
non-proxy design must actually _be_ `Object.prototype`-rooted, with metadata as **own non-enumerable**
props, or every one of those gates needs re-auditing.

**The `get` trap on `obj.value`** (`typed-handler.ts:378-404`), per read: two-level slot → handler
indirection; symbol check; `TypeEntityId` compare; **`Object.getOwnPropertyDescriptor(target, prop)?.get`
at `:394` — allocates a descriptor every read**, exists only to detect string-keyed getters, which live
only on Type entities (`jsonSchema`/`fields`, `Entity/entity.ts:261-279`; the `SchemaId` getter is a
symbol and is already caught by `isBehaviourAccessor`); `Reflect.get` with a foreign receiver (defeats
inline caches); `isValidProxyTarget(value)` which for a primitive **boxes it to probe `symbolIsProxy`**
and walks `String.prototype`/`Number.prototype`. No decode, no schema lookup, no ref resolution on a
primitive read. Estimated split of 250 ns: ~30–50 irreducible trap entry + foreign-receiver get,
~60–100 descriptor allocation, ~20–40 primitive boxing, remainder indirection and guards. → **Stage A.**

**Write gate.** `Obj.update` → `internal.change` → `[ChangeId]` accessor → `executeChange`
(`change-context.ts:116-138`): sets a **module-global** `currentChangeContext = target`, runs
`callback(proxy)` — **the same proxy the caller holds; there is no separate mutable view today** —
then emits `target[EventId]` once if any gated write queued a notification. `set` trap →
`assertMutableWithinChange` throws iff `EventId in root && typeof prop !== 'symbol' &&
currentChangeContext !== root`. So symbol-keyed writes and pre-init writes always pass, and are used
outside `update`: `Obj.setParent`, `parent-annotation.ts:82`, `setMetaOwner`, lazy
`StaticTypeSchemaSlot` caching, `init` of lazily-touched nested records. A non-extensible plain object
must **pre-declare** every such slot as a writable own prop at creation.

**Identity across `db.add`.** The proxy is kept and its handler is **swapped**
(`ProxyHandlerSlot.setHandler`, `proxy-utils.ts:103,132`; `echo-client/echo-handler`). This is the
structural reason the proxy exists. A plain-object design needs getters that read through a re-pointable
store slot so `db.add` can swap the store instead of the handler.

**Nested records** are proxied lazily per access but **cached by identity** in `_proxyMap`
(`proxy-utils.ts:98-101`), and `typed-handler.test.ts:314` asserts `obj.nested === obj.nested`. A plain
object gets this for free — the nested value is an own property.

**Arrays.** `ReactiveArray extends Array` (`reactive-array.ts:39-71`); its overridden mutators call
`Array.prototype[m].apply(this = proxy, …)` so every element write **re-enters the traps** for
validation and notification. Direct `arr[i] = v` is intercepted by the `set` trap **alone**. Without a
proxy there is no way to gate index assignment; `Object.freeze` throws the wrong error and cannot be
undone inside `update`. → **arrays stay proxied (D3).**

**Type entities** are built through the same `makeObject` and depend on the `set` trap to invalidate
`StaticTypeSchemaSlot` when `Type.addFields` mutates `jsonSchema` (`:418-420`). → **stay proxied (D7).**

**Dead code:** `batchEvents` (`event-batch.ts`) only flushes targets fed by `emitEvent`, which has no
callers in `packages/core/echo`; all real batching is `pendingNotificationKey` in `executeChange`.

**Load-bearing proxy introspection inside the directory:** `getRawTarget` (every behaviour accessor,
`deepCopy`), `subscribe` (`reactive.ts:23-26`, `isProxy` guard → must become an `EventId`-presence
check), `checkArrayMutationAllowed`, `_prepareValueForAssignment`/`init`. Outside: `Text.ts:110-114`
(`getProxyHandler`), `Obj.ts:885` (`updateFrom`), `Entity/entity.ts:254`, `echo-client/echo-handler`.

**Stage A, precisely.** Re-reading `get` (`typed-handler.ts:378-404`): the descriptor branch at `:394`
and the fallthrough at `:398` make the **same** `Reflect.get(target, prop, receiver)` call — the
branch's only effect is to skip `createProxy` on a getter's result. So compute the value first, return
it if it is not a valid proxy target (every primitive read exits here with no descriptor), and consult
the descriptor only when the value _would_ be wrapped. Strictly equivalent for every input; the
allocation moves from every read to only object-valued reads. Separately, `isValidProxyTarget`
(`proxy-utils.ts:35-44`) probes `value[symbolIsProxy]` before checking `typeof`, boxing every primitive;
functions can never be valid targets either (`isReactiveRecord` requires an `Object.prototype` or
reactive-proto chain), so a `typeof value !== 'object'` early exit after the null check is exact.

### F2 — Persisted read path (`echo-client/`, report 2026-09-05)

**Two kinds behind one API.** Automerge-backed objects get `EchoReactiveHandler`
(`echo-client/src/echo-handler/echo-handler.ts:96`) swapped in by `db.add` (`:840-861`); their target is
an **empty object** and every field is virtual, decoded from the doc on each access. Feed-backed objects
**keep `TypedReactiveHandler`** — `db.add(obj, { to: feed })` only stamps symbols and registers a
`FeedObjectCore` (`feed-handle.ts:283-309`) — so their data lives on the target and they pay exactly the
unpersisted cost. Stage A therefore covers feed reads too.

**Why an automerge read is 1.7 µs** (`echo-handler.ts:168-216` → `getDecodedValueAtPath`
`echo-prototypes.ts:131-139` → `core.getDecoded` `object-core.ts:434` → `_getRaw` `:414-423`): per read,
**four allocations** (`[...symbolPath]`, `[namespace, ...dataPath]`, `[...mountPath, ...path]`, the
`{ namespace, value, dataPath }` result), ~6 hidden-symbol reads each a prototype hop, three
`instanceof`, a **5-level `Reflect.has`** walk (`:196`) to classify the key as system-accessor vs data,
~12 type branches, an `invariant`, a 4-deep walk into the doc, and `_wrapInProxyIfRequired` boxing the
primitive to probe `symbolIsProxy`. The doc itself is a **materialized frozen JS object**
(`applyAndReturnPatches`), so there is no wasm crossing — it is all JS overhead around a plain load.
**No value cache exists**: `core.targetsMap` caches proxy _targets_ per path, never values;
`getSnapshot` reads every field back through the trap. → **Stage B.**

**Every mutation reaches the object synchronously through one funnel.** Local `set` →
`core.setDecoded` → `core.change` → `docHandle.change` emits `'change'` synchronously
(`doc-handle-proxy.ts:154-165`) → `EntityManager._onDocumentUpdate` (`entity-manager.ts:1736`) →
`core.notifyUpdate()` (`object-core.ts:315-329`). Remote: `_integrateHostUpdate`
(`doc-handle-proxy.ts:286-317`) → same chain. Branch switch: `core.bind()` (`object-core.ts:183-206`)
swaps the doc with no patches and calls `notifyUpdate()` directly. Nothing else can change what a read
returns. So **a per-object cache invalidated in `notifyUpdate` is correct by construction**, and a read
inside an `Obj.update` callback after a `set` sees the new value because the `set` already invalidated it.
`core.updates` and `EventId` are `Event<void>` — whole-object granularity, which is exactly what the
cache needs; per-field patches exist one layer up in `ChangeEvent.patches` if a later version wants
them. Ordering is already right: the refresh runs inside the synchronous `set`, and `EventId` is emitted
later in `executeChange`'s `finally`.

**Stage B, precisely.** A decoded-**leaf** cache on each proxy target's instance state, keyed by `prop`
(no key allocation), stamped with the core's **generation**; `notifyUpdate()` increments the
generation, so invalidation is one integer write and a stale cache is detected by one compare on read.
Check the cache **before** the 5-level `Reflect.has`: a hit proves the key was previously classified as
data, so serving it is safe; a miss falls through to today's path, which populates the cache only when
the wrapped result is a primitive. Records and arrays keep going through `_wrapInProxyIfRequired`, whose
`targetsMap` already gives them stable identity; **refs are excluded in v1** — today each read mints a
new `RefImpl`, and caching one would change identity semantics without a test to say whether anything
relies on it.

**Recorded, not in scope (write path):**

- Each assignment inside one `Obj.update` is a **separate Automerge commit** — `A.change` + `A.diff` +
  a doc `'change'` event + a full `_onDocumentUpdate` pass — with only the `EventId` emit coalesced. This
  is why the batched row saves only ~15–19%: `T` is just the context, `S` is a whole commit. Batching
  sets into one `core.change` would be the real write win.
- `ownKeys` / `has` / `getOwnPropertyDescriptor` on the automerge handler each **decode the whole
  record** (`echo-handler.ts:129-166`), so `Object.keys(obj)` and `{...obj}` are O(n²). A record-level
  cache would fix it; out of scope for the read-path goal.
- Every read of a **ref** field allocates a new `RefImpl` and a new `createRefResolver`
  (`echo-prototypes.ts:376-396`).
- Schema resolution via registry lookup runs **per set** (`echo-prototypes.ts:146-192`).

### F4 — The trap prelude, not the cache (profile 2026-09-05, at `63cc39ab`)

Stage B landed at 464 ns per automerge read (BENCHMARKS.md), 4× the unpersisted read rather than next
to it. A tight-loop harness outside tinybench (5M reads over a 64-object pool, `vite-node` against the
built packages) reproduced the gap — **218 ns automerge vs 77 ns unpersisted** — and a CPU profile at
50 µs sampling put 49% of self time in `EchoReactiveHandler.get` itself, 23% in the caller (the loop plus
proxy dispatch), 11% in `ProxyHandlerSlot.get`, and nothing in `Map` or the document. The cache was
hitting; the cost was everything `get` did before reaching it:

1. `invariant(Array.isArray(target[symbolPath]))` — the log plugin rewrites every `invariant` call to
   pass a call-site record (`{ F, L, S: this, A: [...] }`), so the assertion **allocates an object and an
   array on every read**. Moving the call behind a plain `if` keeps the guard and the allocation on the
   failing branch only: 218 → 201 ns.
2. The four-case symbol `switch` and `target instanceof EchoArray` (a four-step prototype walk on a
   target whose own keys were deleted after `db.add`, so it is in dictionary mode with a per-object
   prototype — every such lookup is megamorphic across the pool). Checking the cache **first** removes both
   from the hit path: 201 → **85 ns**, within ~15 ns of the typed handler.

Why checking first is safe: the cache is only ever populated on the virtual-data path, after
`Reflect.has` has classified the key as not-on-the-prototype-chain, and that surface is static (the
behaviour prototypes are fixed classes; instance state carries only symbols). Array targets have no
`symbolLeafCache` on their chain, so `EchoArray` reads fall through untouched. Every internal accessor
the `switch` serves is a symbol, and symbols never enter the cache. The meta root's virtual
`createdAt`/`updatedAt` return before the caching tail, so they are never stored.

Dictionary mode itself was measured and is **not** the story: an isolated micro-benchmark of the same
three symbol lookups on a fast-mode vs a deleted-keys target differs by ~8 ns.

### F5 — Read cost of the candidate shapes (micro-bench 2026-09-05)

Same harness as F4 (64-object pool, rotating, 20M reads, three rounds), Node 22.22:

| shape                                                                    | ns/read |
| ------------------------------------------------------------------------ | ------: |
| plain object                                                             |    ~7.4 |
| **A** own non-configurable accessors over a store slot, non-extensible   |      ~9 |
| **C** `Proxy` with every trap except `get` (engine forwards the read)    |     ~16 |
| `Proxy` with a minimal JS `get` trap (one lookup on a per-target record) |     ~28 |

Today's real `get` trap measures ~100 ns in tinybench because of what it does around the lookup; the
28 ns row is its floor. Shape C removes the JS call entirely: with no `get` on the handler the engine
performs `[[Get]]` on the target itself, so the target must carry the materialized data as own data
properties, and `set`/`deleteProperty`/`defineProperty`/`has`/`ownKeys` stay trapped. That satisfies
every blueprint assertion unchanged (`writable: true` on a data property, `in` false until set,
`defineProperty` and `delete` intercepted) and applies to open records as well. The trap is re-armed per
object when its core generation moves and removed again once the record is re-materialized.

Shape A is the strict plain object. Its accessors must be `configurable: false` for `defineProperty` and
`delete` to throw rather than silently break the field (the user's condition), which forces every schema
field to exist from creation: `in` is true for unset fields, `Object.keys`/spread list all fifteen
`Example` fields, and chai `deep.eq` — which compares enumerable key counts — fails against any literal
that omits an optional field. Six blueprint relaxations plus an unbounded number elsewhere, for ~7 ns
over shape C.

### F6 — Proxy-identity consumers (survey 2026-09-06, for D11)

Outside `proxy-utils.ts`: `isProxy` 31 call sites, `getProxyTarget` 16, `getRawTarget` 11 (all inside
`echo`), `getProxyHandler` 5, `x[symbolIsProxy]` 4, `getProxySlot`/`setHandler` 1 each (the `db.add`
swap), `ProxyHandlerSlot` 0 (comments only). Every `isProxy` caller needs only the boolean; every
`getProxyTarget` caller needs the raw target. The `WeakMap` registry (`4a92e276`, on `globalThis` in
`71296056`) serves both. `getProxyHandler` is a dispatch seam in three places — `Text.ts:113`
(string CRDT), `echo-prototypes.ts:367` (meta sub-proxy reuses the handler), and
`echo-handler.ts:838/848` (`instanceof EchoReactiveHandler` distinguishes db-backed from in-memory
records) — so the two handler classes stay distinct for now; collapsing them needs another signal for
that discrimination.

Of the four symbols the automerge `get` trap's `switch` serves, three are already real getters on
`EchoRecord.prototype` (`SchemaId`, `TypeEntityId`, `devtoolsFormatter`) and `symbolInternals` is an own
property of the instance state, so a forwarded read finds them. **Only the meta root's virtual
`createdAt`/`updatedAt` have no prototype backing** (readers: `echo-panproto/runner.ts:59`,
`plugin-space` `SpaceHomeDashboard.tsx:67`, 13 assertions in `echo-client-e2e/query.test.ts`); they
need a dedicated meta-root prototype with two getters and a throwing setter. The `getPrototypeOf` trap
must keep reporting `Object.prototype`/`Array.prototype`: `Obj.getSnapshot`, `safe-stringify`,
compute's `isJsonValue`, and the blueprint's `instanceof` assertions all gate on it. Two latent
no-ops noted, not touched: `typed-handler.ts:341` and `:742` probe `target[symbolIsProxy]` inside a
`for…in` over the target's keys (loop-invariant, always false).

### F7 — Automerge handler: construction and mutation paths (survey 2026-09-06, for D11 stage D1)

Every database-loaded object becomes a proxy through one funnel, `initEchoReactiveObjectRootProxy`
(`echo-handler.ts:1058`), reached from `EntityManager.getEntityById`/`loadEntityById`, `db.branch`,
`clone.ts` and `edit-history.ts`; new objects through `createObject`'s two branches; nested records
through `_wrapInProxyIfRequired`; the meta root through `getMeta`, which until D1 built a fresh
uncached target on every call. All of them pass `createProxy` → `handler.init(target)`, so `init` is
the one place to fill a record target, and it runs after the document exists on every path except
`clone.ts` (proxy first, data copied in by a `core.change` that refreshes it). `init` also deletes the
target's own enumerable string keys — the seeded ones `createObject` migrates — so the fill has to
follow that deletion inside `init`, not precede it.

Mutations: the `set`/`deleteProperty` traps know the key; array methods, text CRDT updates, the system
setters (`setMeta`, `setDeleted`, `setType`, `setParent`, …), `atomicReplaceObject`, `clone`, `bind`,
branch merge/sync and remote `_integrateHostUpdate` know only "this object changed". Every one of them
ends in `core.change`/`changeAt` or `core.bind`, and `Event.emit` is synchronous in registration order,
so a refresh at the top of `notifyUpdate` is seen by every subscriber. `core.change`'s bound arm does not
call `notifyUpdate` itself — it relies on `docHandle.change` → entity-manager routing → `_objects.get(id)`
— which is the gap both reviews flagged; D1 closes it by calling the refresh hook directly there.
`initNewObject` sets the document with no notification, so fill-at-construction must follow it (it
does on both `createObject` branches).

`targetsMap` (path-keyed, never pruned) holds every nested record and array target; a shallow refresh of
each record target per change is O(Σ keys of records already handed out). Array targets hold no elements
and read the document per index, so they keep the `get` trap in D1 (D3). `getRaw` bypasses
`upgradeMeta`, so the meta root refreshes from `getDecoded` to keep its defaults; data records refresh
from the raw document object, decoding primitives only, since wrapping a container needs its path, not
its contents. Own data properties invert today's precedence between document keys and prototype members
(`toString`, `id`, `toJSON`); the fill skips keys the prototype chain answers, which is what the `get`
trap's `Reflect.has` check did.

### F8 — Typed handler: what a trap-less read needs (survey 2026-09-06, for D11 stage D2)

The typed `get` trap does four things: serve behaviour accessors (`objectData`, `ChangeId`, `Hash`,
`Equal`, `StaticTypeSchemaSlot` — all already prototype getters, resolvable without a trap), return
`TypeEntityId` unwrapped (a data property; the branch exists only to dodge the wrapping below), skip
own getters (`jsonSchema`/`fields` on type entities), and **wrap nested records and arrays in
sub-proxies on every read** (`createProxy`, memoized per raw target in `_proxyMap`). Only the last needs
the trap, and the target already holds sub-proxies in two places today — `[MetaId]` since creation, and
any user assignment of one sub-proxy to another field (`typed-handler.test.ts:298-315` pins that
identity) — so storing them for all nested values generalizes existing behaviour rather than inventing
it. `Obj.getSnapshot` in fact depends on it: its recursion guard is `getPrototypeOf === Object.prototype`,
which a sub-proxy satisfies through the trap and a raw compacted target (prototype = instance state)
does not.

What breaks if nested values are stored wrapped, from most to least severe: `validateInitialProps`
(`echo-handler.ts:1130-1153`) deletes `undefined` keys by recursing into raw children — through a
sub-proxy that is a `deleteProperty` outside a change context and throws; `deepCopy`
(`typed-handler.ts:82-132`) produces raw copies that two callers store directly and must be re-stamped
and re-wrapped; `TypedReactiveHandler.init` runs inside `createProxy` before the root proxy exists, so
wrapping children there orders against ownership stamping; class instances and `Ref`s must stay raw
(`handler.test.ts:59-73` writes to a class instance outside `update` and expects no throw);
`_applyTextMutation`'s `setDeep` on the raw target must keep bypassing validation. `ReactiveArray` is an
`Array` subclass, not a proxy, and is always handed out wrapped; its element reads go through the same
trap, so arrays keep their proxy trap in D2 (D3) and only record targets go trap-less. No test in
`echo` asserts on handler classes or `symbolIsProxy`; the constraints are behavioural
(`entity-hash.test.ts:82-90` sub-proxy identity, `change.test.ts` enforcement surface,
`handler.test.ts:49-56` `[objectData]` shape).

### F3 — Blast radius (report 2026-09-05)

**63 introspection call sites in 20 files** (`isProxy|getProxyTarget|getProxyHandler|getProxySlot|
getRawTarget|isValidProxyTarget`), most mechanical. The ones encoding a semantic: the handler swap on
`db.add` (`echo-handler.ts:835-862`, also `Object.setPrototypeOf(target, state)` at
`echo-prototypes.ts:677`, which **throws on a non-extensible object**); `isEchoObjectField` via
`getProxyHandler(v) instanceof EchoReactiveHandler` (`:756-769`); `Text.*` dispatch through the slot
(`Text.ts:110-114`, `echo-client/text.ts:92`, `echo-doc/Doc.ts:36`); `Entity/entity.ts:254-279`
writing new keys on the raw target after creation; `subscribe`'s `isProxy` no-op guard.

**Only one `new Proxy` creates ECHO objects** (`proxy-utils.ts:104`). `echo-panproto/lens/live.ts:112`
wraps a live object in a second Proxy synthesizing keys — see D9.

**Enumeration.** The typed handler defines no `has`/`getOwnPropertyDescriptor`/`ownKeys` override —
already plain semantics. The db handler synthesizes all three from the doc and fakes an own `id`
descriptor (`:141-143`). Consumers routing through them: `Obj.updateFrom`, `feed-object-core.ts:280-289`,
`ObjectCore.encode`, `deepMapValues` (snapshot, serializer, clone), `snapshotForComparison`, `deepCopy`,
devtools. `snapshot.ts:67` skips any value whose prototype is not `Object.prototype` — so metadata must
never sit on a visible prototype.

**187 symbol reads in 57 files** outside the proxy directory — `Entity/api.ts`, `guard.ts`, `model.ts`,
`snapshot.ts` (copies 11 symbols), `clone.ts`, `parent-annotation.ts`, `Ref/*`, `Filter/match.ts`,
`Obj.ts:764,814` (`ParentId` get **and set**), `Type.ts`, `Database.ts`, plus compute/assistant/plugin
consumers. All resolve through the get trap today.

**Reactivity bridge — one seam, no proxy introspection.** `reactive.ts:16-31` `subscribe` →
`target[EventId].on`. Atom families key on object identity via `Equal`/`Hash` (`Obj/atoms.ts`);
`useObject` (200 refs / 128 files), `Obj.atom*` (64 / 34), 20 direct `Obj.subscribe` sites, 3 raw
`core.updates.on`. None break as long as `EventId` is reachable and identity survives `db.add` and
nested reads (`blueprint-test.ts:100-107, 207` assert `obj.nested === obj.nested`).

**Tests pinning proxy behaviour.** `echo/change.test.ts`: 10× `toThrow(/outside of Obj.update/)`.
`echo-client/reactive-proxy.blueprint-test.ts` (×2 runs): identity, `Object.keys` `:249`, `has` `:263`
(**false before assignment**), `instanceof` `:279`, spread `:294`, `toJSON` `:303`, `defineProperty`
`:332` (**one notification**), `getOwnPropertyDescriptor` `:343` (**`writable: true`**), `delete`
`:354`, keys-change events `:439`. `reactive.test.ts:36-45` "subscribe is a no-op for non-proxy input".

**The gate is context-keyed, not reference-keyed.** Of 1,098 `*.update(` call sites, **84 (37
non-test) write through the outer reference** inside a zero-arg callback — `Entity.update(obj, () =>
Entity.setLabel(obj, …))` and the like (`RenamePopover.tsx:37`, `sdk/versioning/model.ts` ×8,
`plugin-explorer/tree.ts` ×6, `react-ui-form` ×4). Any design that gates by _which reference_ is written
through — the "mutable proxy in the callback" variant — breaks all of them. A design that gates by the
global change context, as the accessor setter in the Proposal does, does not. This was the decisive
argument for "same object in the callback" (Proposal), and it is moot while C is blocked.

**Mutation outside `Obj.update` that relies on the gate bypass** (symbol writes and pre-init writes
pass today): `feed-handle.ts:295-298` stamps three symbols on live items; `Obj.setParent` and
`parent-annotation.ts:82` write `ParentId` after the context exits; `StaticTypeSchemaSlot` cache
write/delete (`typed-handler.ts:242,419`); `_applyTextMutation`'s `setDeep` on the raw target (`:525`);
the handler swap's `setPrototypeOf` and `stripShadowingProperties` deletes. Every one would need a
pre-declared slot or a `defineProperty` path under a non-extensible design.

**Arrays, beyond D3:** `length` cannot be made non-writable and then writable, and a non-extensible
array cannot `push` even for the system. `arr.length = 0` outside `update` is unblockable without a
trap.

## References

- Baseline: `packages/core/echo/echo-client-e2e/BENCHMARKS.md` @ `0dab2f81`.
- Bench: `packages/core/echo/echo-client-e2e/src/property-access.bench.ts` (PR #12951).
- Write gate today: `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:271`
  (`assertMutableWithinChange`); change context: `internal/common/proxy/reactive.ts:68` (`change`).
