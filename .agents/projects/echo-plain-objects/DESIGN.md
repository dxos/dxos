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
clean.

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
