# Atom `keepAlive` Retention Audit

_Phase 7 of the memory-usage project. Static audit — every `Atom.keepAlive` site
in the repo, classified by whether its key space is bounded, and ranked by
estimated saving. Numbers are modelled, not measured; see "Measuring this" for
how to turn them into data._

## The mechanism

Three facts from `effect@4.0.0-rc.108`
(`src/unstable/reactivity/{Atom,AtomRegistry}.ts`) combine into a permanent
leak. None of them is a bug on its own.

1. **`Atom.family` is weak, and safe on its own.** It keys a `MutableHashMap`
   whose values are `WeakRef<Atom>`, with a `FinalizationRegistry` that deletes
   the entry — _and its key_ — once the atom is collected (`Atom.ts:1532`).
2. **The registry is strong.** `RegistryImpl.nodes` is a plain
   `Map<Atom, NodeImpl>` (`AtomRegistry.ts:478`). A node leaves it only via
   `removeNode`, gated on `canBeRemoved`.
3. **`keepAlive` makes `canBeRemoved` permanently false**
   (`AtomRegistry.ts:746`): `!this.atom.keepAlive && listeners.size === 0 && …`.
   `atomHasTtl` is likewise short-circuited (`AtomRegistry.ts:541`), so idle-TTL
   eviction never applies either.

So `Atom.family(k => Atom.make(…).pipe(Atom.keepAlive))` produces, for every
distinct key ever read through a registry:

```
MutableHashMap entry:  key (STRONG) ──> WeakRef(atom)
                                             │  never clears, because…
registry.nodes:        atom (STRONG) ──> NodeImpl { _value, lifetime, 3× Set }
```

The `WeakRef` never clears because the registry pins the atom; the family's
strong key therefore never releases either. **The key, the atom, the last
computed value, and the atom's lifetime finalizers all live for the tab's
lifetime.** For ECHO families the key is a live object proxy and the lifetime
holds an `Obj.subscribe` handle — so the object core and its Automerge doc
handle are pinned too, and every mutation still fans out to subscribers nobody
is watching.

### There is no eviction API

`AtomRegistry` exposes no "forget this atom". `app-graph` works around it by
writing `Option.none()` into removed nodes (`graph.ts:1090`, with a standing
`TODO(wittjosiah): Is there a way to mark these atom values for garbage
collection?`). That frees the payload but not the node shell, the atom, or the
family key.

### Cost model

Per pinned entry, independent of the value:

| Component                                                                                      |         Estimate |
| ---------------------------------------------------------------------------------------------- | ---------------: |
| `registry.nodes` Map entry                                                                     |            ~40 B |
| `NodeImpl` object (15 slots)                                                                   |           ~160 B |
| `parents` / `children` / `listeners` empty `Set`s                                              |           ~330 B |
| `WriteContextImpl` + `Lifetime` + finalizers array                                             |           ~200 B |
| Atom copy from `keepAlive` (`Object.assign` of the whole atom) + `read` closure + label string |       ~250–400 B |
| `MutableHashMap` entry + `WeakRef` + `FinalizationRegistry` cell                               |           ~150 B |
| **Fixed floor**                                                                                | **≈ 1.0–1.3 KB** |

Plus the retained value, plus whatever the read closure captures. Use **1 KB per
pinned atom** as the floor for the tables below.

### The distinction that decides every fix

- **Derived** — the value is re-computable from a source of truth that outlives
  the atom (an ECHO object, an index, another atom). `keepAlive` here is a pure
  cache with an unbounded eviction policy. **Removing it loses nothing.**
- **Stateful** — the registry is the only store for the value; dropping the node
  silently resets user-visible state. These genuinely need pinning, but should
  pin **one container atom**, not one atom per key.

Almost every site below is derived.

---

## Ranked catalog

### Band A — tens of MB, unbounded in the size of the user's data

#### A1. ECHO object atom families — `packages/core/echo/echo/src/internal/Obj/atoms.ts`

The largest by a wide margin. **Eight** `keepAlive` families, all keyed by a
**live ECHO entity or `Ref`**:

| Family                       |    Line | Key                   | Retained value                      |
| ---------------------------- | ------: | --------------------- | ----------------------------------- |
| `objectFamily`               |      43 | object proxy          | full **deep clone** (`getSnapshot`) |
| `refFamily`                  |      61 | `Ref`                 | deep clone of target                |
| `propertyFamily` (nested)    |   89/90 | object → property key | shallow copy of one property        |
| `objectWithReactiveFamily`   |     114 | object proxy          | the live object                     |
| `refPropertyFamily` (nested) | 151/152 | `Ref` → property key  | property value                      |
| `entityFamily`               |     163 | entity                | deep clone                          |
| `relationFamily`             |     179 | relation              | deep clone                          |
| `labelAtomFamily`            |     267 | entity                | label string                        |

Reached from `Obj.atom` (47 call sites), `Obj.atomProperty` (15),
`Obj.atomReactive` (6) and — the volume driver — **`useObject`, 190 call sites**.
Every ECHO object ever rendered pins:

1. the object proxy itself (family key),
2. a deep JSON clone of it (`getSnapshot` → `deepMapValues`, `snapshot.ts:59`),
3. a live `subscribe()` handle for the tab's lifetime.

Three compounding consequences:

- **Retention scales with objects _scrolled past_, not objects open.** A mailbox
  session that scrolls 2,000 messages at ~5 KB of body text pins ~10 MB of
  snapshot clones that are never read again. This is a _fifth_ copy on top of
  the 4–5× already catalogued under Phase 2 — and the only one that never
  releases.
- **It blocks Phase 2's other open item.** "Automerge doc handles are never
  evicted" cannot be fixed while every object ever rendered holds a live
  subscription pinning its core.
- **It feeds Phase 4's churn.** Dead subscribers still recompute a full deep
  clone on every mutation of their object — allocation for nobody.

`refWithReactiveFamily` (line 129) is the one family here **without**
`keepAlive`, and is the model the others should follow.

Estimate, session touching 1k–10k distinct objects at 3–6 families each:
**3–60 MB of shells + 5–40 MB of snapshots.**

**Fix:** delete `.pipe(Atom.keepAlive)` from all eight. Purely derived — the
ECHO object is the source of truth and re-deriving is one `getSnapshot`. Pair
with a registry `defaultIdleTTL` (below) so the cache still spans a re-render.

#### A2. App graph node and edge atoms — `packages/sdk/app-graph/src/graph.ts`

`_node` (175) and `_edges` (188), keyed by node id string, both `keepAlive`.
Node ids are unbounded: one per space, collection, object, action and action
group ever surfaced. The known case; the numbers are worse than they look
because it is _two_ atoms per id and actions multiply node count several-fold
per visible object.

Removal (`graph.ts:1086`) nulls the node payload but leaves the shell, the atom
and the family key — so a session that opens and closes many objects keeps
paying ~2 KB per id forever.

Estimate, 2k–20k node ids over a session: **4–40 MB of shells + 3–30 MB of live
node payloads.**

`_nodeOrThrow`, `_connections`, `_actions`, `_json` are already un-pinned; so is
everything in `graph-builder.ts`. Only the two writable atoms need attention.

**Fix:** `_node`/`_edges` are the one place in this audit where the atom really
is the store. Move the backing values into a plain `Map<string, …>` owned by the
graph, keep **one** `keepAlive` atom per graph for change notification (or keep
per-id atoms un-pinned and seed them from the map on rebuild), and delete map
entries in `removeNodeImpl` — which resolves the existing TODO as a side effect.

---

### Band B — single-digit MB, unbounded in session activity

#### B1. NavTree model families — `packages/plugins/plugin-navtree/src/hooks/useNavTreeModel.ts`

**Five** `keepAlive` families (lines 26, 72, 78, 87, 95), keyed by tree path or
node id. All derived from the graph and from navtree state.

The aggravating factor: the families are built inside `useMemo` **in the hook**,
so each mount of `useNavTreeModel` creates a _fresh_ family producing _fresh_
atoms. The previous mount's atoms stay pinned in the registry but are no longer
reachable through any family — pure garbage, and the leak multiplies by mount
count, not just by path count. NavTree remounts on layout changes.

`capabilities/state.ts:68` (`itemAtomFamily`, per-path open/current state) is
the stateful counterpart and is legitimately long-lived — but note it already
keeps its own `backingState` map, so the atom is not the sole store there either.

Estimate: **1–5 MB**, scaling with (paths × remounts).

**Fix:** drop `keepAlive` from all five derived families in the hook. For
`state.ts`, pin one container atom over `backingState` instead of one atom per
path.

#### B2. Attention and view-state backends — `packages/ui/react-ui-attention/`

`core/backends.ts:25` (`MemoryBackend`) and `:94` (`LocalBackend`), plus
`types/Attention.ts:89` (`_getAtom`). These are **strictly worse than
`Atom.family`**: a hand-rolled `Map<string, Atom>` holds the atom **strongly**,
so the atom is double-pinned — the weak-key machinery that would eventually
help is not even in play.

Keyed by `${aspect}:${contextId}` / qualified DOM id — unbounded in objects
attended or selected over a session. Values are small (`{hasAttention,
isAncestor, isRelated}`, selection records), so this is shell-dominated.

The comments correctly identify _why_ `keepAlive` was added ("the registry
sweeps the unsubscribed atom back to its default") — that is the registry's
zero-TTL behaviour, and it is exactly what `defaultIdleTTL` is for.

Estimate: **0.5–3 MB.**

**Fix:** `LocalBackend` already persists to `localStorage`, so its atoms are
derived — drop `keepAlive` and re-seed from storage. `MemoryBackend` and
`Attention` are stateful; hold the values in the existing `Map` and pin a single
container atom.

#### B3. TagIndex — `packages/sdk/schema/src/TagIndex.ts`

`tagFamily` (67), `taggedIdsFamily` (89), `objectTagsFamily` (106), all
`keepAlive`, keyed by `[tagIndex, objectId, tagUri]` tuples. Purely derived —
each one re-reads `bind(tagIndex)` and subscribes to the index. Unbounded in
tagged objects × tags viewed. Small values, many entries, and each holds an
`Obj.subscribe` on the index, so every tag mutation wakes all of them.

Estimate: **0.5–3 MB**, plus meaningful idle churn.

**Fix:** drop `keepAlive`. Fully re-derivable.

#### B4. Magazine post atoms — `packages/plugins/plugin-magazine/src/atoms/`

Five `keepAlive` families keyed by `Post` objects or `[Post, Magazine]` tuples:
`post-display.ts:33`, `post-read.ts:21`, `post-content.ts:13`,
`post-curation.ts:22`, `post-tags.ts:43`. `postDisplayAtom` retains a full
snapshot plus snippet and image URL per post; a feed reader accumulates posts
without bound.

Note `magazine-posts.ts` deliberately leaves its three families un-pinned —
same package, right instinct, so this is an inconsistency rather than a design
choice.

Estimate: **0.5–5 MB** for an active magazine user, negligible otherwise.

**Fix:** drop `keepAlive` from all five, matching `magazine-posts.ts`.

---

### Band C — sub-MB, but unbounded and trivially fixable

| Site                                               |      Line | Key space              | Note                                                                                             |
| -------------------------------------------------- | --------: | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `sdk/schema/src/StateMap.ts`                       |        65 | `[stateMap, entityId]` | derived; re-reads `bind(stateMap)`                                                               |
| `echo/internal/Annotation/atoms.ts`                | 22/23, 47 | entity → annotation    | derived; pins entity proxies like A1                                                             |
| `echo/internal/Ref/atoms.ts`                       |        17 | `Ref`                  | derived; pins ref + target subscription                                                          |
| `plugin-native-filesystem/…/markdown-documents.ts` |       121 | `fileId`               | generation counter; one per file ever bound                                                      |
| `react-ui-menu/src/components/Menu.tsx`            |        53 | —                      | **per-mount**: `useMemo(…keepAlive, [])`, one pinned `MenuItemsMap` per menu mount, forever      |
| `plugin-sheet/…/useToolbarState.ts`                |        21 | —                      | **per-mount**, same shape                                                                        |
| `plugin-assistant/src/capabilities/state.ts`       |        28 | —                      | singleton, but the value is `Record<string, Obj.Unknown>` — grows per chat and pins ECHO objects |

The two per-mount sites deserve emphasis: they are not families, so they read as
harmless singletons, but `useMemo` mints a new atom on every mount and each one
is pinned forever. `Menu` mounts on essentially every dropdown in the app.

Estimate: **0.2–2 MB combined**; the `Menu` site dominates in a long session.

---

### Band D — bounded, no action needed

Correct uses of `keepAlive`. Recorded so a future sweep does not churn them.

- **Bounded families:** `app-framework/core/capability-manager.ts` (149, 153, 160) keyed by capability interface id; `app-framework/ui/…/SurfaceManager.ts`
  (64) keyed by surface role. Both key spaces are fixed by the plugin set.
- **Singletons — the registry is the store, and there is exactly one:**
  `plugin-manager/manager-state.ts` (9 atoms), `core/registry.ts:92`,
  `sdk/migrations/src/migrations.ts:31`, `common/effect/src/atom-kvs.ts:40`,
  `app-toolkit/…/progress-registry.ts:20`, `compute/assistant/…/AiContext.ts`
  (74, 75), `compute-runtime/…/trigger-dispatcher.ts:296`, and the per-plugin
  state capabilities (`plugin-space`, `plugin-meeting`, `plugin-review`,
  `plugin-code`, `plugin-transcription`, `plugin-deck`, `plugin-theme`,
  `plugin-iroh-beacon`, `plugin-native`, `plugin-debug`, `plugin-calls`).
- **Per-instance, lifetime-scoped:** `react-ui-canvas/…/CellGrid/state/atoms.ts`
  (5 atoms per grid).
- **Tests and stories:** ignored throughout.

Families **without** `keepAlive` — already correct, listed so they are not
mistaken for gaps: all of `graph-builder.ts`, `graph.ts` `_connections` /
`_actions` / `_json`, `app-graph/src/atoms.ts`, `halo/src/Identity.ts:343`,
`plugin-kanban`, `plugin-pipeline`, `plugin-inbox`, `plugin-stack`,
`plugin-calls/call-manager.ts`, `plugin-routine`, `magazine-posts.ts`, and the
`app-graph-builder.ts` `selectedId` families in `plugin-ibkr`, `plugin-trip`,
`plugin-magazine`, `plugin-meeting`.

---

## Bounding plan

Work items to bound every site above **except A2 (app-graph)**, which is being
addressed independently. Each item is independently landable; W1 goes first
because it makes every later removal a cache-policy tweak instead of a
behaviour change. Both mechanisms the plan relies on already exist upstream —
`Atom.setIdleTTL` (per-atom TTL, honoured by any registry; `Atom.ts:213`) and
`useAtomMount` (`@effect/atom-react/Hooks.ts:225`, pins an atom for exactly a
component's lifetime) — so no Effect changes are needed.

### The lifetime model

One rule decides every item below: **an atom's lifetime is bounded by its
subscribers, plus a short idle TTL; the family's weak keying does the rest.**
Once the registry stops pinning an atom, the only strong references are its
active subscribers. When the last one leaves and the TTL lapses, the node is
swept, the atom becomes collectable, the family's `FinalizationRegistry` drops
the entry — and the key (for ECHO, the object proxy) is released with it.

For the ECHO families this yields exactly "atom bounded to the life of the
object", by subset: a subscriber implies the object is rendered, so
atom-lifetime ⊆ object-lifetime — and it **inverts the pin**. Today atoms hold
live `Obj.subscribe` handles on objects nobody is watching, so the atom layer
is what keeps object cores (and their doc handles) resident. After W2, a swept
atom holds nothing, and object residency becomes ECHO's decision alone — the
onus moves upstream to ECHO to bound how many objects it keeps materialized
(the Phase 2 doc-handle-eviction item, currently blocked by these very
subscriptions).

The alternative reading — cache the atom as long as ECHO holds the object,
evict the two together — would need a registry eviction API that does not
exist. Subscriber-bounding is a strict subset of that lifetime and needs no
upstream change; if a cache tied to object residency ever proves necessary,
that is an Effect feature request, not something to emulate with `keepAlive`.

### W1. TTL groundwork — first, small

The reason every site reached for `keepAlive` is that an un-pinned atom is
swept on the **very next scheduled task** after its last subscriber leaves
(`scheduleNodeRemoval`, 0 ms — `plugin-manager.ts:312` builds the app registry
with a bare `Registry.make()`, no `defaultIdleTTL`; `@effect/atom-react`'s
default context registry uses 400 ms).

- Set `defaultIdleTTL` on the `PluginManager` registry. Start at ~5 s: long
  enough to span remounts, tab switches within a deck, and virtualized-list
  scroll jitter; short enough that scrolled-past state drains promptly.
- Hot derived families that want a longer cache set their own
  `Atom.setIdleTTL` per family (W2 does this for ECHO) — package-local, and
  independent of which registry hosts the atom.
- Add a lifecycle regression test against `AtomRegistry.getNodes()`:
  subscribe → unsubscribe → clock advance → node gone; and (under
  `--expose-gc`) family key released.

### W2. ECHO atom families — the big one

Scope: `echo/src/internal/Obj/atoms.ts` (8 families),
`internal/Annotation/atoms.ts` (2), `internal/Ref/atoms.ts` (1).

- Remove `.pipe(Atom.keepAlive)` from all eleven; add
  `Atom.setIdleTTL(ECHO_ATOM_TTL)` (~5–30 s, one shared constant) so a
  re-render or quick navigation re-attaches to the cached node instead of
  re-cloning.
- Rebuild semantics are already correct: every family's `read` re-subscribes
  from scratch and registers an `addFinalizer` unsubscribe, so sweep → later
  re-read is a clean rebuild. `refWithReactiveFamily` (line 129) has run
  un-pinned all along — the existence proof.
- Audit the non-React consumers: `grep` for one-shot `registry.get(Obj.atom…)`
  reads (graph builders, tools). Each such read builds and sweeps a node; the
  TTL amortizes repeats. None should need pinning — if one does, it pins on
  its own side with `registry.mount`, not in the family.
- Add `withLabel` to each family while touching them, so the census (below)
  attributes per family.
- Tests: existing `echo-react` `useObject` suite, `proxy-identity.test.ts`,
  `entity-hash.test.ts`, plus a new leak test — render N objects, unmount,
  advance TTL, assert registry node count returns to baseline.
- Record the unblocked follow-up in Phase 2: with atoms no longer holding
  subscriptions on unwatched objects, ECHO can evict object cores/doc handles
  by residency policy (LRU over materialized cores, or eviction on space
  close). That work is ECHO's, not the atom layer's; this item just removes
  the structural blocker.

Risk: a consumer that relied on a pinned atom's value surviving with zero
subscribers (write-then-read-later through the registry). The ECHO families
are read-only derivations, so none should exist; the leak test plus a mailbox
smoke run is the check.

### W3. Attention / view-state backends — container pattern

Scope: `react-ui-attention` — `MemoryBackend`, `LocalBackend`
(`core/backends.ts:25`, `:94`), `AttentionManager._getAtom`
(`types/Attention.ts:89`).

These are stateful (the comments are right that a swept atom would drop
session state), but they already own a strong `Map` — so the fix is to make
the **map** the store and stop pinning per-key atoms:

- `LocalBackend`: derived — `localStorage` is the store. Drop `keepAlive`; the
  atom's read seeds from storage (it already does), sweep loses nothing.
- `MemoryBackend`: keep values in a plain `Map<string, value>`; atoms become
  un-pinned reads over the map, writes update the map then the atom. One
  pinned notify atom per backend instance, not one per key. On-demand reads by
  agent tools (the scenario the current comment defends) read the map.
- `AttentionManager`: same conversion, plus prune — `update()` sees the full
  current id set, so entries for ids no longer in the DOM can be deleted
  instead of accumulating for the session.

Bounded result: pinned atoms per backend = 1, map entries prunable by owner.

### W4. Derived families in SDK and plugins — mechanical removals

All value-recomputable, no container needed; drop `keepAlive`, W1's TTL covers
re-render continuity:

- `sdk/schema/src/TagIndex.ts` — 3 families (also stops N dead subscribers
  recomputing on every tag mutation).
- `sdk/schema/src/StateMap.ts` — `sliceFamily`.
- `plugin-magazine/src/atoms/` — 5 families; brings them in line with
  `magazine-posts.ts`, which is already un-pinned.
- `plugin-navtree/src/hooks/useNavTreeModel.ts` — 5 families. Also fix the
  per-mount multiplication: the families are created inside `useMemo`, so each
  remount strands the previous generation. Either hoist to module-level
  families keyed by `graph` (nested `Atom.family`), or accept that once
  un-pinned the stranded generation is collectable and leave the `useMemo`.
  Prefer the hoist — it also restores cross-remount cache hits.
- `plugin-navtree/src/capabilities/state.ts` `itemAtomFamily` — stateful, but
  `backingState` (a plain `Map`) is already the store and reads already seed
  from it; un-pin the family and route writes through map-then-atom, same
  shape as W3.
- `plugin-native-filesystem` `markdownBindingGeneration` (both copies) —
  generation counters; a swept counter restarting at 0 is still a change
  signal, so un-pinning is safe.

### W5. Per-mount atoms — swap `keepAlive` for `useAtomMount`

Scope: `react-ui-menu/Menu.tsx:53`, `plugin-sheet/useToolbarState.ts:21`.

Replace `useMemo(() => Atom.make(…).pipe(Atom.keepAlive), [])` with the same
`useMemo` minus `keepAlive`, plus `useAtomMount(atom)`. The mount holds a
listener for exactly the component's lifetime — the menu-items map survives
while the provider is mounted even when no menu content is open (the case
`keepAlive` was defending against), and is swept after unmount + TTL instead
of never. If more sites with this shape appear, extract a
`useSessionAtom(make)` helper.

### W6. Growing singletons — bound the value, not the atom

`plugin-assistant/capabilities/state.ts:28` `companionChatCacheAtom`: the atom
is a legitimate singleton, but its value is a `Record<string, Obj.Unknown>`
that grows per companion chat and pins ECHO objects. Evict the entry when its
companion closes (deck state already knows), or cap with LRU semantics. Keeps
the existing TODO about serialization/hydration intact. Same review for
`AiContext._objects` if session-scoped growth shows up in the census.

### W7. Guardrails and verification

- Lint rule (alongside `dxos-subpath-imports`): flag `Atom.keepAlive` inside
  an `Atom.family` callback or a `useMemo`; allowlist the Band D sites.
- Registry census in `plugin-debug`'s stats panel (see below); run the Phase 1
  mailbox scenario before W2 and after each item; `scripts/memory/soak.mjs`
  for the RSS trend.

### Sequencing

| Order | Item                      | Size | Depends on  |
| ----- | ------------------------- | ---- | ----------- |
| 1     | W1 TTL groundwork         | S    | —           |
| 2     | W2 ECHO families          | M    | W1          |
| 3     | W4 mechanical removals    | S–M  | W1          |
| 4     | W5 per-mount swaps        | S    | W1          |
| 5     | W3 attention containers   | M    | W1          |
| 6     | W6 singleton value bounds | S    | census data |
| 7     | W7 lint + census          | S–M  | W2 landed   |

W2–W5 are parallelizable once W1 lands. A2 (app-graph `_node`/`_edges`) is
deliberately absent — being handled independently; its container-pattern shape
is sketched in the site entry above if useful there.

## Measuring this

The audit is static; the bands are modelled from the cost table, not observed.
`AtomRegistry` exposes `getNodes()`, and `graph.ts` / `graph-builder.ts` already
tag atoms via `withLabel(...)`, so a census is cheap to build:

1. Add a registry census to `plugin-debug`'s stats panel — count nodes, bucket
   by `keepAlive`, and group by label prefix (`graph:node:`, `graph:edges:`, …)
   and by atom-constructor site for the unlabelled ones.
2. Run the mailbox scenario from Phase 1 (the 1,887 MB ledger) and record the
   node count and retained size before and after each of R1–R4.
3. Cross-check against a heap snapshot: the retainer path should read
   `RegistryImpl.nodes → NodeImpl → _value`, which makes the attribution
   unambiguous in DevTools.

Labelling the ECHO families with `withLabel` first would make step 1 give a
direct per-family breakdown, which is the fastest way to confirm or refute the
A1 estimate.
