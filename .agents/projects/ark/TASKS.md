# ark — Tasks

_Resume: PR [#12873](https://github.com/dxos/dxos/pull/12873) is open — `react-ui-list: rebuild Tree
on @ark-ui/react TreeView`. Design lives in
[`packages/ui/react-ui-list/docs/TREE.md`](../../../packages/ui/react-ui-list/docs/TREE.md), not
here. Bundle impact is measured and accepted (~17 KB brotli on one lazy chunk; the eager boot graph
moves 1.6 KB and the boot budget is untouched). The open work is the ARIA regression the rebuild
introduced in navtree, the doc refresh, and a decision on what `Treegrid` is for now that `Tree` no
longer uses it._

## Phase 1: Tree rebuild on Ark (PR #12873)

Landed on the branch. Detail, decisions and the experiment log:
[docs/TREE.md](../../../packages/ui/react-ui-list/docs/TREE.md).

- [x] **Rebuild `Tree` on `@ark-ui/react` TreeView** — machine-owned focus/ARIA, APG keymap
      (arrows, Home/End, typeahead, `*`), atom walk into a controlled `TreeCollection`.
- [x] **Keep pragmatic-drag-and-drop** — `TreeData` payload and the navtree `monitorForElements`
      contract unchanged.
- [x] **Preserve the public prop surface** so `plugin-navtree` needed no code changes.
- [x] **Measure the bundle impact** — both branches built with `moon run composer-app:bundle` and the
      emitted assets diffed. Numbers in docs/TREE.md §6.

## Phase 2: Fallout from the rebuild

- [x] **Remove the orphaned `gridcell` roles in navtree.** The five `Treegrid.Cell` wrappers in
      `NavTreeItemColumns.tsx` emitted `role="gridcell"` with no `row` ancestor once the enclosing
      row became an Ark `treeitem`. Removed; the empty one is a plain `<div />` holding the actions
      column in the subgrid. Verified live: the navtree renders `role="tree"` + 3 `treeitem` and
      **0 `gridcell`**, with the sidebar visually unchanged. `plugin-navtree` build + lint green.
- [x] **Refresh the stale docs.** `react-ui-list/DESIGN.md` component table and the Tree/Treegrid
      diagrams now describe the Ark machine; `AUDIT.md:136` lists the real consumers;
      `useListNavigation.ts:100` no longer says `Tree (Treegrid)`. The measured bundle analysis,
      adoption economics and Treegrid disposition are folded into `docs/TREE.md` §6–§8.
- [x] **Settle the `NavTree` Default story.** Not a branch regression — it does render and the tree
      is correct; cold boot in a headless probe just exceeds 30 s. Recorded in docs/TREE.md §5 as an
      open question about whether that cold-start cost can trip the play function's 10 s timeout in
      CI.

## Phase 3: `Treegrid` disposition (tracked follow-up)

Tracked 2026-08-31. The rebuild decoupled `Tree` from `Treegrid` entirely — `Tree.tsx` has zero
`Treegrid` references where `main` had `Treegrid.Root` + `Treegrid.Row`/`Cell`. That leaves
`Treegrid` a generic multi-column grid primitive with three consumers, **two of which are not trees**:

| consumer                              | API used                             | shape                                |
| ------------------------------------- | ------------------------------------ | ------------------------------------ |
| `plugin-navtree` `NavTreeItemColumns` | `Cell` only — no Root/Row            | vestigial; removed by Phase 2        |
| `devtools` `ObjectsTree`              | Root + Row + Cell + `TreeItemToggle` | real expandable hierarchy            |
| `plugin-assistant` `ProcessTree`      | Root + Row + Cell, 4 cols            | pre-flattened rows, no disclosure    |
| `plugin-atproto` `AtprotoCompanion`   | Root + Row + Cell, 3 cols            | flat field table; `depth` is padding |

- [ ] **Decide what `Treegrid` is for.** Either keep it as a generic multi-column grid primitive and
      **rename it** (`role=treegrid` misdescribes two of its three uses), or migrate `ObjectsTree`
      onto `Tree` and delete it. Do not "replace it with `Tree`" wholesale: `ProcessTree` would gain
      nothing (no disclosure to model) and `AtprotoCompanion` is a flat table that wants a grid.
- [ ] **Scope the `ObjectsTree` → `Tree` migration** — the only genuine candidate, but it is a
      rewrite onto the `TreeModel` atom-family contract, not a swap.
- [x] Drop the stale `Treegrid` mention in `react-ui-list/src/hooks/useListNavigation.ts:100` — now
      reads `Tree (Ark TreeView machine)`.

## Phase 4: Deferred — wider Ark adoption

Measured and **not** recommended as a cost-saving exercise; see docs/TREE.md §7. The shared Zag
runtime is ~24.5 KB raw and the Tree has already paid all of it, so every further machine is marginal
cost against a much smaller hand-rolled component (Accordion +4.6 KB net, Listbox +20 KB, Combobox
+85 KB). Migrate for behavior, not for amortization.

- [x] **Measure what a full `@fluentui/react-tabster` removal would net.** Done — numbers and the
      conclusion in docs/TREE.md §7. **68,256 bytes minified in the eager boot graph** (`tabster`
      59,820 + `keyborg` 6,298 in `boot-4`, plus the 2,138-byte fluentui wrapper in `boot-5`); the
      used API surface bundles to 76,623 raw / 21,736 gzip / 19,392 brotli. Bigger than the entire
      Ark Tree cost, and in the eager graph rather than a lazy chunk.
- [ ] Evaluate Ark's Accordion on merit (+4.6 KB net over `@radix-ui/react-accordion`) — the only
      swap cheap enough to decide on behavior alone.
- [ ] **Evaluate moving the core of `react-ui-list` and `@fluentui/react-tabster` to
      `@ark-ui/react`** — the whole-stack version of the question, as one evaluation rather than
      per-component. Tracked 2026-08-31. Constraints below.

### Constraints on that evaluation

Already measured (docs/TREE.md §6–§7) — these are what the evaluation has to answer, not assumptions
to re-derive:

1. **Bundle size is not the case for it.** Ark's shared Zag runtime is ~24.5 KB raw and the Tree
   already bought all of it; per-machine marginal cost then runs Accordion +8,125 raw, Listbox
   +22,470, Combobox +87,936 — each against a hand-rolled component an order of magnitude smaller. A
   full `react-ui-list` sweep is net **worse** on bytes.
2. **Tabster and `react-ui-list` are separable problems.** All four `react-ui-list` tabster call
   sites are in lazy chunks and attribute zero boot bytes; the 68 KB prize is behind three
   `@dxos/react-ui` files. Migrating this package off tabster saves nothing, and taking the prize
   does not require touching this package.
3. **Ark has no groupper.** `useArrowNavigationGroup`/`useFocusableGroup` are generic
   composite-widget focus zones; Zag's focus management is per-machine and `focus-trap` is a trap.
   Any plan that ends tabster needs an in-house roving-tabindex hook regardless of how much Ark is
   adopted.
4. **The case, if there is one, is coherence** — one interaction/accessibility model across the
   package instead of four (Ark machine, tabster roving-tabindex, Radix, bespoke activedescendant),
   with APG conformance maintained upstream. Size the migration against that, and price the ~85 KB
   Combobox explicitly since it is the one that decides the total.

## Phase 5: Replace `@fluentui/react-tabster`

Tracked 2026-08-31. The largest measured win available in this area, and — despite living in this
ledger — **a `@dxos/react-ui` project, not an Ark adoption**. Prize: **68,256 bytes minified in the
eager boot graph** (`tabster` 59,820 + `keyborg` 6,298 in `boot-4`, plus the 2,138-byte fluentui
wrapper in `boot-5`); the used API surface bundles to 76,623 raw / 21,736 gzip / 19,392 brotli.
Larger than the entire Ark Tree cost, and in the eager graph rather than a lazy chunk. Evidence:
docs/TREE.md §7.

Three constraints, all measured:

1. **Only three files keep tabster in boot**, all in `@dxos/react-ui`: `Focus/Focus.tsx`,
   `Main/MainContext.ts` (a single `useFocusableGroup` call) and `Carousel/Carousel.tsx`. Removing
   tabster from those three is what collects the 68 KB.
2. **The other ten importers are lazy and attribute zero boot bytes** — `plugin-deck`,
   `plugin-support`, `sdk/shell`, `react-ui-tabs`, `react-ui-masonry`, and all four in
   `react-ui-list`. They must still be migrated to remove the dependency outright, but they are not
   where the win is.
3. **Ark is not the replacement.** Zag's focus management is per-machine; `focus-trap` is a modal
   trap, not a roving-tabindex groupper — see docs/MIGRATION.md §1. The API to replace is
   `useArrowNavigationGroup`, `useFocusFinders`, `useFocusableGroup` and
   `useMergedTabsterAttributes_unstable`.

### Tasks

- [ ] **Write the in-house roving-tabindex/groupper hook** in `@dxos/react-ui` covering
      `useArrowNavigationGroup` + `useFocusableGroup`. This is the whole project's critical path.
- [ ] **Cut the three boot-reachable files over** (`Focus.tsx`, `MainContext.ts`, `Carousel.tsx`),
      then re-run `moon run composer-app:bundle` + `check-boot-budget` and confirm the eager graph
      drops by ~66 KB. Ark's `carousel` machine is a candidate for the third file if the hook does
      not cover it cleanly.
- [ ] **Migrate the remaining ten importers** to drop the dependency from `package.json` entirely.
- [ ] **Re-baseline `MAX_PRELOAD_BYTES`** in `composer-app/scripts/check-boot-budget.mjs` downward
      once the win lands — a budget left at 4.45 MB silently absorbs the gain.

## Phase 6: Theme variants for `react-ui-list`

Tracked 2026-08-31. Bring `List.theme.ts` up to the pattern
[`react-ui-form/src/components/Form/Form.theme.ts`](../../../packages/ui/react-ui-form/src/components/Form/Form.theme.ts)
established.

Gap today: `listTheme` has slots and exactly one **structural** variant (`hasIcon`, which reserves
the leading-icon grid track). `formTheme` has a **named-variant axis** — `variant: default |
settings` — where selecting a variant restyles every slot for a usage context, plus a companion
non-class `behavior` record keyed by the same names (`showDescription`), and a `formSlots` export for
`bridgeTv` registration. `listTheme` exports `listSlots` but has no variant axis and no behavior map.

- [ ] **Add a `variant` axis to `listTheme`** mirroring `formTheme`'s shape: named contexts that
      restyle slots together, `defaultVariants.variant = 'default'`, and a `behavior` record keyed by
      the same variant names for the non-class decisions.
- [ ] **Decide the variant names from real call sites** rather than inventing them — the candidates
      are the density/context splits the components already hand-roll at the point of use (sidebar vs
      document vs dialog/popover), so survey those before fixing the axis.
- [ ] **Fold `Treegrid.theme.ts` in or leave it deliberately separate.** It is a second, standalone
      `tv` recipe with its own `rowLevel` lookup and no central registration; whether it joins
      `List.theme.ts` depends on the Phase 3 decision about what `Treegrid` is for.
- [ ] Confirm `bridgeTv` registration still resolves once the axis exists, since `listSlots` is
      derived from `styles()` and a variant axis changes nothing about slot names but does change
      what a consumer must pass.

## Phase 7: Reimplement `react-ui-task` on the Tree

Tracked 2026-08-31. `@dxos/react-ui-task` renders a hierarchical task list and, today, re-derives
most of what the Ark-based `Tree` now provides. `TaskList.tsx` is **1,324 lines** plus a bespoke
`hierarchy.ts` (191) and `dnd.ts` (46); it borrows only leaf pieces from `react-ui-list`
(`Listbox`, `TreeDropIndicator`, `TreeItemToggle`, `paddingIndentation`, `useListDisclosure`) and
hand-rolls its own roles, keyboard handling and drag wiring on top of `Task.parentTask`.

The prospective target, `@dxos/react-ui-tree`, **does not exist yet** — this item presupposes
extracting `Tree` out of `react-ui-list` into its own package. That extraction is the real
precondition and should be decided first, alongside the Phase 3 `Treegrid` question, since both are
"what belongs in `react-ui-list`" decisions.

Why it is worth doing: the Tree already owns the APG keymap, machine-managed focus and ARIA, and the
pragmatic-dnd contract. Reimplementing `TaskList` on it should delete the bespoke hierarchy walk and
most of the keyboard/role handling, and would give the task list the accessibility behaviour it does
not have today — the same argument that justified the navtree rebuild.

- [ ] **Decide whether `Tree` is extracted into `@dxos/react-ui-tree`.** Precondition for everything
      below. Weigh against Phase 3 (Treegrid) and the `react-ui`→`react-ui-list` layering rule in
      AUDIT.md §1.4 — a new package must not create an upward edge.
- [ ] **Map `TaskList`'s requirements onto the `TreeModel` contract.** It stores hierarchy as
      `Task.parentTask` and moves nodes with a single `MoveTask` mutation taking a parent/index pair;
      the Tree's model is atom families keyed by path. Establish that the mapping is faithful before
      committing — this is where the migration succeeds or fails.
- [ ] **Reimplement `TaskList` on the Tree**, deleting `hierarchy.ts` + `dnd.ts` and the hand-rolled
      roles/keyboard handling in favour of the machine's.
- [ ] **Keep the sub-task disclosure semantics.** `TaskList` documents a per-viewer, per-list open
      state and a rule about not hiding a newly added first sub-task; confirm the Tree's controlled
      `expandedValue` reproduces it rather than assuming path-keyed state is equivalent.
- [ ] Port `hierarchy.test.ts` (155 lines) to whatever replaces the walk, rather than dropping the
      coverage with the module.

## Suspect — `SPACE_INITIALIZING` stall seen in the agent browser (attribution CORRECTED)

Found 2026-08-31 while trying to verify `AtprotoCompanion`. Not ark work and not caused by this
branch.

> **CORRECTION (same day).** This was first written up as a repo-wide defect to hand to an ECHO
> owner. That attribution is **not supported**: the user reports `devtools/ObjectsTree` renders fine
> in their browser, while in the agent's in-app browser it renders an empty root with
> `Timeout [5,000ms] at Trigger.wait` (`useAsyncEffect.ts:17`). So the agent browser is at least
> partly implicated, and this must NOT be handed to an owner as a confirmed repo defect until
> someone reproduces it in a normal browser. The mechanism below is accurately described; only the
> blame is uncertain.
>
> Note also that two _different_ harnesses are involved, with two different symptoms, which the
> original entry conflated:
>
> - `withPluginManager` + `ClientPlugin` (`AtprotoCompanion`, `ConnectionView`) → story's own
>   `<Loading />` fallback, identity created, space stuck at state 4, zero objects.
> - `withClientProvider` (`ObjectsTree`) → nothing rendered at all, `Trigger.wait` timeout.
>
> **Decisive open check:** does a `withPluginManager` story (e.g.
> `plugins-plugin-atproto-atprotocompanion--published`) seed correctly in a normal browser? If yes,
> delete this entry — it is an agent-environment artefact.

**Symptom.** Every ECHO-client-backed story hangs in `<Loading />` forever. Confirmed on
`plugin-atproto` `AtprotoCompanion` (all four stories) and `plugin-connector` `ConnectionView`, which
this branch does not touch.

**Root cause.** `SpaceProxy._initializeDb`
([space-proxy.ts:449](../../../packages/sdk/client/src/echo/space-proxy.ts)) ends by blocking on a
`propertiesAvailable` trigger that only wakes when `query(Filter.type(SpaceProperties))` returns
**exactly one** result. The space contains **zero objects**, so it never wakes, `_initializeDb` never
returns, `_initializationComplete` never fires, and `waitUntilReady()`
([line 542](../../../packages/sdk/client/src/echo/space-proxy.ts)) never resolves. Every story seed's
second line is `waitUntilReady()`, so seeding stops there and nothing is ever added.

**Evidence** (probed against the live client in the running story):

| probe                           | value   | meaning                                       |
| ------------------------------- | ------- | --------------------------------------------- |
| `client.halo.identity.get()`    | present | `initializeIdentity` ran — the seed started   |
| `space.state.get()`             | `4`     | `SPACE_INITIALIZING`, never `SPACE_READY` (3) |
| `db.query(Filter.everything())` | `0`     | seed never got past `waitUntilReady()`        |
| `client.spaces.default`         | `false` | default space never completed                 |

The recurring console warning `Action "Finding properties for a space" is taking more then 5,000ms`
is emitted by the `warnAfterTimeout` wrapping that exact wait, which ties the log to the deadlock.

**Ruled out:** machine load (16 cores, load average 2.8, 81% memory free — an earlier claim of mine
that the numbers did not support); stale Storybook state (reproduced after a restart with
`.cache/storybook` deleted); cold start (still zero objects at 83 s on a warm server); this branch
(reproduced on `origin/main` via a second Storybook on port 9010); and browser capability or stale
state in the agent browser (SharedWorker, Worker, OPFS and IndexedDB all present and working; OPFS
empty, no Web Locks held or pending, no service workers).

**NOT ruled out:** something specific to the agent's in-app browser that the capability probes above
do not cover.

**Not yet known:** _why_ `SpaceProperties` never materialises — never created, created in another
space, or its automerge doc never loads. `slow AM open {duration: 5005ms}` hints at the last.

- [ ] Run the decisive check above in a normal browser BEFORE handing this to anyone.
- [ ] Consider a timeout or fallback on the `propertiesAvailable` wait — a space that waits forever
      for an object that will never exist is unrecoverable and gives the caller no signal.

## Phase 8: `ProcessTree` on the Tree — landed with one open defect

Done 2026-08-31. `ProcessTree` no longer uses `Treegrid`: it builds a pruned process forest, adapts
it with `createStaticTreeModel`, and renders through `Tree`. Verified in Storybook (client-free
story, so unaffected by the `SPACE_INITIALIZING` deadlock above).

**Gained:** real `role=tree` / `role=treeitem` with machine-managed `aria-level` (1/2/1/1/1 measured)
and `aria-expanded` on branches only, the APG keymap, and expand/collapse the flattened view never
had. `aria-level` used to be derived by counting `~` separators in the DOM `id`.

**Enabling change:** `Tree` gained an optional `renderIcon` slot (`IconRenderer` in `TreeContext`).
`TreeItemDataProps.icon` names a static glyph, which cannot express `ProcessTree`'s status icon —
`animate-spin` on RUNNING, per-state hue, and a tooltip carrying the state. Verified the Tree stories
render unchanged when the slot is absent.

**Live-data note:** `processes` carries live metrics, so the forest and model are rebuilt on every
tick. Open state is therefore held in a `useRef` outside the model and re-seeded through `isOpen`, or
a collapse would be undone by the next tick.

- [ ] **DEFECT: collapse sets the ARIA state but does not visually collapse.** Clicking the branch
      trigger flips `aria-expanded` to `false` and `data-state` to `closed`, but the branch content
      stays at `blockSize: 34px` with the child still visible; `getAnimations()` is empty 6 s later.
      The same interaction in `ui/react-ui-list/Tree`'s own story collapses correctly (child
      `offsetParent` null), so this is the `ProcessTree` integration, not `Tree`. Suspects, in order:
      the `ScrollArea.Root`/`Viewport` wrapper (two ancestors report `blockSize: 0px`), the custom
      three-column `gridTemplateColumns`, and whether writing `open: false` straight into the state
      atom races `Tree`'s own conceal-then-`commitClose` sequencing (docs/TREE.md §2 gap 1).
      Next diagnostic: compare the computed `animation-name`/`fill-mode` on `[data-part=
"branch-content"]` between the two stories — that distinguishes "animation never applied" from
      "ran and reverted".

## Phase 9: `ObjectsTree` on the Tree — NOT VERIFIED BY THE AGENT

Done 2026-08-31. `devtools/ObjectsTree` no longer uses `Treegrid`; it exposes a `TreeModel` view over
its existing atoms and renders through `Tree`. **Builds and lints clean, but the agent's browser
cannot render this story** (see the corrected `SPACE_INITIALIZING` entry), so it is unverified —
the user has the working story at
`http://localhost:9009/?path=/story/devtools-devtools-objectstree--default`.

Two corrections to earlier analysis in this ledger, both found by reading `Tree`'s walk rather than
assuming:

1. **`Tree` already guards cycles.** `Tree.tsx:107` skips any child whose id is already on
   `parentPath` — strictly stronger than `ObjectsTree`'s old `child.id !== parent?.id`, which only
   excluded the immediate parent. An earlier entry here claimed `TreeModel.childIds` had to be
   extended with the path to make this migration possible. **That was wrong; no contract change was
   needed.**
2. **The real constraint is that the walk recurses into every branch regardless of `open`** — `open`
   only decides what lands in `expanded`. Left alone that would query the entire reachable object
   graph on first render. `childIds` is therefore gated on the node being open, so the walk stops one
   level ahead; `itemProps.parentOf` still reads that level, which the row needed anyway to decide
   whether to draw a toggle. This is the "unloaded branch" case `TreeContext` documents via
   `childrenCount`.

Design notes for whoever reviews it: props are keyed by path, not id, because `type` (and so the
relation arrow) is computed relative to the anchor a node was reached through — the same entity reads
differently under two parents. Open state is written twice on toggle: by path (what `Tree` addresses
rows by) and by id (what gates the walk).

- [ ] **Verify in the story** — expand/collapse, relation arrows on both directions, the role label,
      the row action menu, and deleted-object strikethrough.
- [ ] Confirm expanding into a relation cycle terminates (it should now be handled by `Tree`'s
      ancestor check rather than `ObjectsTree`'s single-level one).
- [ ] With this landed, `Treegrid`'s only remaining consumer is `plugin-atproto`'s
      `AtprotoCompanion`, whose rows are read-only — Phase 3 can be settled by moving it to grouped
      semantic markup and deleting `Treegrid`.
