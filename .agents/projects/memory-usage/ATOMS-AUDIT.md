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

## Remedies

### R1. Give the app registry a `defaultIdleTTL` — do this first

`PluginManager` builds the app-wide registry with a bare
`Registry.make()` (`plugin-manager.ts:312`), i.e. **no idle TTL**: a
non-`keepAlive` atom is swept on the very next scheduled task after its last
subscriber leaves (`scheduleNodeRemoval`, 0 ms). That aggressiveness is _the
reason_ every site above reached for `keepAlive` — several say so in their
comments verbatim.

For contrast, `@effect/atom-react`'s default context registry uses
`defaultIdleTTL: 400`.

Setting a TTL (30–60 s is a reasonable starting point) converts "pinned forever"
into "cached for a while" and makes removing `keepAlive` a safe, mechanical
change everywhere else. Without it, each removal is a behaviour change to argue
about individually. **This is the enabling change for R2.**

### R2. Remove `keepAlive` from every derived family

Bands A1, B1–B4, C. No state is lost: the value is re-derivable from ECHO, an
index, storage, or another atom. Mechanical, per-file, independently landable.

### R3. Pin containers, not keys

For the genuinely stateful sites — `graph.ts` `_node`/`_edges`, navtree
`itemAtomFamily`, `MemoryBackend`, `Attention._map` — hold values in a plain
`Map` that the owner controls and can delete from, and pin **one** atom for
change notification. Bounded pinned count: 1 per owner instead of 1 per key.
Resolves the `removeNodeImpl` TODO as a by-product.

### R4. Fix the per-mount sites

`Menu.tsx:53` and `useToolbarState.ts:21`: drop `keepAlive`, or scope the atom
to a provider that disposes. Two-line changes.

### R5. Lint rule

`Atom.keepAlive` inside an `Atom.family` callback, or inside a `useMemo`, is
almost always wrong. Worth a rule alongside `dxos-subpath-imports` once R2 has
landed and the remaining sites are the intentional ones.

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
