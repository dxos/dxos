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

- [x] **Decided and done: `Treegrid` is DELETED.** All three consumers moved — `ObjectsTree` and
      `ProcessTree` onto `Tree` (Phases 9 and 8), and `AtprotoCompanion` onto a plain `role="table"`,
      since its rows are read-only and it was never a treegrid. The directory, its export and its
      theme are gone; `react-ui-list` builds, and so do all four former consumers.
- [x] **`ObjectsTree` → `Tree` migration** — done and verified (Phase 9).
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
- [x] **Accordion migrated to Ark** (+4.6 KB net over `@radix-ui/react-accordion`). Done on merit,
      not bytes: the component carried a `TODO(burdon): Support key navigation` and the machine
      supplies the APG keymap. Verified in its story — ArrowDown moves focus between triggers, End
      jumps to the last, pointer expand opens the content. Public surface unchanged, so no consumer
      moved; the radix dependency and its `composer-app` prebundle entry are gone.
- [ ] **Evaluate moving the core of `react-ui-list` to `@ark-ui/react`** — the whole-stack version
      of the question, as one evaluation rather than per-component. Tracked 2026-08-31; narrowed
      2026-09-01 when Phase 5 landed, which removed `@fluentui/react-tabster` from the repo and so
      took it out of this item's scope. Constraints below.

### Constraints on that evaluation

Already measured (docs/TREE.md §6–§7) — these are what the evaluation has to answer, not assumptions
to re-derive:

1. **Bundle size is not the case for it.** Ark's shared Zag runtime is ~24.5 KB raw and the Tree
   already bought all of it; per-machine marginal cost then runs Accordion +8,125 raw, Listbox
   +22,470, Combobox +87,936 — each against a hand-rolled component an order of magnitude smaller. A
   full `react-ui-list` sweep is net **worse** on bytes.
2. **Settled by Phase 5 — tabster is gone.** The separability this constraint argued for held: the
   68 KB was taken without touching `react-ui-list`. Nothing in the repo depends on
   `@fluentui/react-tabster` any more, so it is no longer a term in this evaluation. (Two stale
   references remain in `OrderedListRoot.tsx` prose.)
3. **Ark has no groupper — and the replacement already exists.** Zag's focus management is
   per-machine and `focus-trap` is a trap, so ending tabster needed an in-house roving-tabindex
   hook. Phase 5 built it: `useFocusGroup` in `@dxos/react-focus`. The evaluation inherits it
   rather than having to budget for it.
4. **The case, if there is one, is coherence** — one interaction/accessibility model across the
   package instead of four (Ark machine, tabster roving-tabindex, Radix, bespoke activedescendant),
   with APG conformance maintained upstream. Size the migration against that, and price the ~85 KB
   Combobox explicitly since it is the one that decides the total.

## Phase 5: Replace `@fluentui/react-tabster` — done

Design record:
[`packages/ui/react-primitives/react-focus/docs/FOCUS.md`](../../../packages/ui/react-primitives/react-focus/docs/FOCUS.md)
— the mechanism
(sentinels, the `Tab` hand-off, what "entered" means), the alternatives that do not work, the
size accounting, and every call site.

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

- [x] **Write the in-house roving-tabindex/groupper hook** —
      [`useFocusGroup`](../../../packages/ui/react-primitives/react-focus/src/useFocusGroup.ts) over the DOM
      primitives in [`focus.ts`](../../../packages/ui/react-primitives/react-focus/src/focus.ts). One hook
      covers both tabster concerns: `axis` gives arrow-key navigation (a mover), `tabBehavior` gives
      the `Tab` boundary (a groupper), so `useMergedTabsterAttributes_unstable` has no successor.
      Boundaries are a pair of zero-size sentinel children — tabster's mechanism, and the reason
      neither tabindex nor React's rendering has to be fought. `useFocusFinders` becomes the plain
      `findFirstFocusable` / `findLastFocusable`. Nine unit tests in `useFocusGroup.test.tsx`.
- [x] **Cut the three boot-reachable files over** (`Focus.tsx`, `MainContext.ts`, `Carousel.tsx`).
      `keyborg` went the same way: the only signal read from it — `data-w-keyboard` — is now set by
      `trackKeyboardModality`. Ark's `carousel` machine was not needed. Measured after
      `moon run composer-app:bundle`: **zero `tabster` or `keyborg` modules in the eager graph**
      (checked against every preload chunk's sourcemap `sources`), 4,360,490 bytes over 21 entries.
- [x] **Migrate the remaining ten importers** — `@fluentui/react-tabster`, `tabster` and `keyborg`
      are gone from every `package.json`, the catalog and the lockfile.
- [x] **Re-baseline `MAX_PRELOAD_BYTES`** to 4.35 MB, keeping the same ~200 KB margin.

Two defects the keyboard verification caught, neither of which the build or the types would have:

- `Main.tsx`'s sidebars never received the group's ref. `useForwardedRef` writes the forwarded ref
  once in an effect, which never delivers the node when `Root` swaps between `Primitive.div` and
  `DialogContent` on a media-query change — so the landmark grouppers silently did nothing.
  `useMergeRefs` instead.
- "Entered" cannot be derived from focus alone. A container that is not itself a tab stop has no
  state to be entered from: focus reaching its contents is how an enclosing group steps ONTO it.
  Without that, `Listbox` in `list` mode (rows are `tabIndex=-1`) lost arrow navigation entirely.

Verified by keyboard in Storybook against the exemplar, `Focus`, `Main`, `Carousel` and `Listbox`:
arrow traversal and its axis/edge behaviour, `Escape` out of a row, the trap's wrap, landmark `Tab`
between panes, a listbox as a single tab stop, and re-entry landing on the memorized row.

Phase 5 grew into its own project: the code now lives in `@dxos/react-focus`, and attention and
hotkeys join it there. See [`.agents/projects/react-focus/TASKS.md`](../react-focus/TASKS.md).

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
- [ ] Confirm `bridgeTv` registration still resolves once the axis exists, since `listSlots` is
      derived from `styles()` and a variant axis changes nothing about slot names but does change
      what a consumer must pass.

## Phase 7: Reimplement `react-ui-task` on the Tree — landed

Tracked 2026-08-31, implemented the same day. `@dxos/react-ui-task` rendered a hierarchical task
list that re-derived most of what the Ark-based `Tree` provides: `TaskList.tsx` at **1,324 lines**
plus a bespoke `hierarchy.ts` (191) and `dnd.ts` (46), borrowing only leaf pieces from
`react-ui-list` and hand-rolling its own roles, keyboard handling and drag wiring on top of
`Task.parentTask`.

**The `@dxos/react-ui-tree` extraction was NOT required and did not happen.** The original entry
named it as a precondition; that was wrong. `react-ui-task` already depends on `react-ui-list`, so
`TaskTreeContent` imports `Tree` from `@dxos/react-ui-list` directly and no new package — and no new
layering edge — was introduced. Extraction remains an open _packaging_ question (see Phase 3), not a
blocker for any consumer.

What landed:

- [x] **Mapped `TaskList` onto the `TreeModel` contract.** `tree-model.ts` builds a `TaskNode` forest
      from `Task.parentTask` under a synthetic `TASK_TREE_ROOT_ID` root and feeds it to
      `createStaticTreeModel`. A task has exactly one parent, so it occupies exactly one path — which
      is what lets the list keep collapse keyed by id while `Tree` addresses rows by path.
      `buildTaskPaths` is the bridge. Cycle-safe in the same way as `walkTaskTree`.
- [x] **Rendered `TaskList` through `Tree`** (`TaskTreeContent.tsx`), so the machine owns disclosure,
      roving focus and the APG keymap. Row anatomy becomes `[toggle][heading][columns]`; `Alt+Arrow`
      restructuring still reaches the row handler because zag ignores modified arrows.
- [x] **Kept the disclosure semantics.** Open state is seeded from the list's `collapsed` set and
      written back through `onOpenChange`; the set survives model rebuilds when the task array
      changes. `collapsed` is deliberately kept out of the model memo's deps — a new model per toggle
      rebuilt the collection and repainted every row (the flicker).
- [x] **Selection is driven in, not held.** `TaskList.Root` still owns `selected`; an effect writes
      `current` into `model.stateAtom(path)` so selecting elsewhere cannot leave the tree stale.
- [x] Coverage: `tree-model.test.ts` (7 tests) covers topology, sibling order, dangling parents,
      cycles, seeded collapse and path uniqueness.

Still open (the Phase 7 gaps):

- [x] **Descriptions in the tree path.** Done. The tree heading rendered only the title, so a
      hierarchical list silently dropped the descriptions the flat list showed. The heading is now a
      grid so the description starts in the title's own column — clearing the ordinal and the status
      control, rather than reading as part of the row above — and both paths share one
      `TaskDescription` so they cannot drift on type scale or clamping. Verified in the
      `Hierarchical` story.
- [x] **Drag handles / reordering — done and verified by the user 2026-09-01.** `TaskTreeContent`
      enables `Tree`'s `draggable` and installs the drop monitor; placements resolve through
      `resolveTaskPlacement`, with `reparent` handled and an end-of-list strip (`dropAtEnd`) so a
      task can be dropped past the last row. The dragged row leaves the list for the gesture and its
      subtree travels with it. Drop semantics and the measured zone map: `docs/TREE.md` §9.
- [ ] **Retire `dnd.ts` / `hierarchy.ts` from the flat path.** The one real remaining gap. `dnd.ts` and `hierarchy.ts` are
      still present and still serve the flat path; `TaskTreeContent` never passes `draggable` to
      `Tree`. Moving drag onto the Tree's pragmatic-dnd contract is what finally deletes them — and
      only then does `hierarchy.test.ts` (155 lines) get ported rather than dropped.
      **Deliberately not attempted unattended:** pragmatic-dnd uses native HTML5 drag, so synthetic
      drags no-op and the result cannot be verified without a human performing the gesture. Landing
      unverifiable drag behaviour is worse than leaving the flat path in place.
- [x] **Inline title editing — NOT a gap; the earlier entry was wrong.** The tree heading renders a
      plain `<span>`, but so does the flat row (`TaskList.tsx`, the title cell). Editing lives in the
      detail pane, which is path-independent — "the whole reason editing moved out of the row", as
      the `TestEdit` story puts it. Neither path has inline title editing, so the tree is not behind.
- [x] **Conceal animation — NOT a defect; the earlier entry was wrong.** This was written up as "the
      branch never runs its close animation in the task tree — rows disappear instantly". Measured
      in the `Hierarchical` story on 2026-09-01 and that is not what happens: collapsing a branch
      fires `animationstart`/`animationend` for `tree-conceal` on `branch-content`, and sampling
      the element per frame shows height ramping 102 → 41 px with opacity 1.00 → 0.63 over ~114 ms
      before landing at 0. `interpolate-size: allow-keywords` is supported, so the height keyframes
      apply rather than degrading to opacity-only. Nothing to fix.

## Suspect — `SPACE_INITIALIZING` stall seen in the agent browser (attribution CORRECTED)

Found 2026-08-31 while trying to verify `AtprotoCompanion`. Not ark work and not caused by this
branch.

**RESOLVED 2026-09-01 for `plugin-trip`, and the attribution below was wrong twice over.** The
`TripArticle` Default story rendered nothing because its seed **threw before adding anything**:
`TripBuilder.addFlight` forwarded the caller's `{ name, code }` airline straight into `Segment`'s
`provider`, and `Provider` is `{ name, domain, ref }` — so `Segment.make` raised
`TypeError: Unknown property: details.provider.code`, inside `onClientInitialized`'s Effect where
it was swallowed. No exception surfaced, no object was added, and the article sat on its loading
state showing `{ space: true, db: true, trip: false }`. Fixed in `testing/builder.ts`, with a unit
test over the Default sequence and a `play` assertion on the story — the latter verified to fail
without the fix (30 s timeout) and pass with it. The render-only smoke test never caught it,
because a swallowed throw still renders.

Two diagnoses of my own were wrong on the way: that every `withPluginManager` story stalls (only
Default did — the others seed differently), and that `Empty` rendering nothing ruled out a seeding
fault (it shares the same decorators, so it proved nothing).

What remains unexplained is the SEPARATE `SPACE_INITIALIZING` observation below, which is about a
space with zero objects rather than a throwing seed. Do not merge the two.

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

## Phase 8: `ProcessTree` on the Tree — landed, verified

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

- [x] **RETRACTED — there was no defect; collapse works.** Confirmed by screenshot: collapsing
      "Trigger watcher" removes the nested "Translate content" row (5 rows to 4). The report was
      built on two bad measurements, both mine: - `offsetParent` was used as a visibility test. It is `null` for any `display: contents`
      element, and Ark's branch wrapper is exactly that — so the check reported "hidden" in
      `Tree`'s own story and "visible" here purely from where each element sat in the parts tree,
      never from whether anything was on screen. - The conceal animation being cancelled mid-flight, and `block-size` never reaching 0, were
      treated as the failure. `Tree`'s own story does both identically (animation cancelled by
      150 ms, `block-size` held at 136 px, no `hidden` attribute) and collapses correctly, so that
      is shared, normal behaviour rather than a symptom.

Lesson worth keeping: for "is it visible", take the screenshot. Three rounds of DOM instrumentation
pointed the wrong way; one before/after image settled it immediately.

## Phase 9: `ObjectsTree` on the Tree — VERIFIED by the user

Done 2026-08-31. `devtools/ObjectsTree` no longer uses `Treegrid`; it exposes a `TreeModel` view over
its existing atoms and renders through `Tree`. The agent's browser cannot render this story (see the corrected
`SPACE_INITIALIZING` entry), so it was verified by the user from a screenshot: top-level rows render,
icon hues survive, nesting indents correctly, chevrons show mixed expanded/collapsed state, and
**both relation arrow directions appear** — the discriminating case for the bug below.

Three bugs were found after the first commit; the first is what broke the story:

1. `itemProps` passed the synthetic root anchor into `#atoms`, which asserts `EntityId.isValid`, so
   every top-level row threw.
2. `#itemFamily` built its query atom inside the compute function, introducing a fresh dependency on
   every recomputation.
3. The renderers read the id-keyed `item`, whose `type` resolves against a `null` anchor, so every
   relation drew the incoming arrow. They now read `model.itemAt(path)`.

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

- [x] **Verify in the story** — rows, arrows (both directions), hues, nesting and chevron state
      confirmed by the user.
- [ ] Still unchecked: the role label (`$.key`), the row action menu, and deleted-object
      strikethrough.
- [ ] Cosmetic, PRE-EXISTING: a branch whose only child is the ancestor you arrived through shows a
      chevron that opens to nothing (`parentOf` counts it before the walk drops it). The old code had
      the same shape; it should now occur less often, since `Tree` excludes all ancestors rather than
      only the immediate parent.
- [ ] Confirm expanding into a relation cycle terminates (it should now be handled by `Tree`'s
      ancestor check rather than `ObjectsTree`'s single-level one).
- [x] Settled by Phase 3: `AtprotoCompanion` moved to semantic markup and `Treegrid` was deleted.
      Nothing in the repo references it, so its theme file went with it.

## Phase 10: Reimplement `ToolWidget` on the Ark-backed Accordion — landed

Tracked and implemented 2026-09-01. `ToolWidget` rendered a run of tool blocks as one collapsible
panel with a row per call, driven by `TogglePanel` plus its own `useState`. It now composes both Ark
machines: `TogglePanel` (rebuilt on Collapsible) wraps the run, and the calls inside it are an
`Accordion` from `react-ui-list`.

- [x] **Mapped `TogglePanel` onto `Accordion`.** The run's calls are accordion items; a call with no
      payload stays a plain row, since a caret that reveals emptiness reads as a failure. The
      single-call case keeps its own shape — the summary collapses into the row and the panel's own
      disclosure opens onto the detail — so it needed no extra slot.
- [x] **Restored the animation**, and the workarounds it was substituting for are gone with it. The
      `duration={0}` opt-out is removed; the body ramps against the Collapsible's `--height`
      (measured 0 → 124px). The scrollbar that prompted the opt-out was never the panel's: the
      block editor's `.cm-scroller` was a frame short of the growing widget for the whole animation
      and painted one throughout. Pinned to `overflow-y: hidden`, which is honest — an item's editor
      is auto-height and the feed is what scrolls.
- [x] **`TogglePanel` is NOT retired.** Six consumers, and the compound's parts and props are
      unchanged, so none of them moved. It gained `caret` (`'start' | 'end'`) and a `classNames`
      pass-through; `ToolWidget` uses `caret='end'` so the summary reads as a line of prose with an
      affordance after it rather than a panel header.
- [x] **Verified in the assistant stories**, including the editor interaction the entry warned
      about. The widget takes `w-0 min-w-full` so a wide payload no longer stretches CodeMirror's
      content line and scrolls the whole block; the payload is its own inline-axis scroller. Also
      fixed while there: the accordion's end items clipped their trigger's focus ring, and the copy
      button sat off the disclosure caret's column.

Not done, deliberately: the widget still owns its open state rather than delegating it, since
`TogglePanel` is the run's disclosure and the accordion is only the rows inside it.

## Phase 11: Collapsible disclosure for form objects

Tracked 2026-09-01. Now that `TogglePanel` is an Ark Collapsible and the Accordion carries the APG
keymap, the same disclosure should back nested objects in `react-ui-form` — an object field is a
disclosure by nature, and the form currently expresses it without one.

- [ ] **Use a collapsible disclosure for form objects.** Establish first whether a nested object
      wants `Collapsible` (one independent region) or `Accordion` (a set where the machine tracks
      which are open), since the form renders many siblings and that is what decides the choice.
- [ ] Check it against the `Form.Viewport`/`Form.Section` composition rather than wrapping fields in
      a new container — the viewport owns the gutter, and an extra wrapper there loses it.

## Phase 12: Optional guide line inside branch content

Tracked 2026-09-01. A `Tree` option to draw a vertical rule down a branch's content, connecting a
parent to its descendants — the outliner convention for showing which rows belong to which branch
once a list is deep enough that indentation alone stops carrying it.

- [ ] **Draw it on `TreeBranchContent`**, which already spans the row grid and is the only element
      that knows a subtree's full extent. A per-row border would restart at every row and leave a
      dashed column rather than one line.
- [ ] **Place it against the disclosure toggle's centreline**, not the indent step: the line reads as
      descending _from_ the chevron, and the toggle is one control wide regardless of depth.
- [ ] Check it survives the conceal animation — the content box is clipped and its height is
      animated, so a line anchored to the box's bottom edge would be drawn mid-ramp and then cut.

## Phase 13: Checkbox in place of the ordinal

Tracked 2026-09-01. A `TaskList` option to render a checkbox in the gutter where the ordinal sits,
for a list read as things to tick off rather than things to refer to by number.

- [ ] **Put it in the gutter cell, not beside the status control.** The two would read as two ways to
      complete a task; the checkbox stands in for the ordinal, so the row keeps one geometry and the
      trailing columns do not move.
- [ ] **Decide what it writes.** `status: 'done'` is the obvious binding, which makes the checkbox
      and the status control the same edit in two places — settle whether the status control is
      hidden in this mode rather than leaving both live.
- [ ] Both list paths, through `TaskOrdinal`'s cell: the flat gutter also hosts the drag handle on
      hover, so the checkbox has to share that cell rather than claim a column.

## Phase 14: Dragging a task jumps — settle the write as one sync operation

Tracked 2026-09-01, from the `TaskSetArticle` drag work.

- [x] **Resolved.** The jump was self-inflicted: `0234feb119` moved the drop onto `useOperation`
      (the invoker), which is asynchronous, so the tree painted from the model before the write
      landed and again after. #12863 had deliberately made this path synchronous — `MoveTask` peeks
      its refs and suspends only when one is unloaded, so with the rows in hand `Effect.runSync`
      commits in the same tick the gesture ends. Restored.
- [ ] The `Effect.runSync` path is only sound while every ref is loaded. Decide what should happen
      when one is not: today the effect would suspend and `runSync` throws, which is a crash rather
      than a slow drop.

## Phase 15: Selected-task action from the ProjectArticle toolbar

Tracked 2026-09-01. Verbatim: "ProjectArticle should configure the TaskSetArticle to use checkboxes
and show a button in the toobar to delete all selected tasks to a new chat session".

- [ ] **Configure the embedded `TaskSetArticle` for checkboxes.** Depends on Phase 13, which puts a
      checkbox in the gutter cell; this is the first caller that needs it, so settle Phase 13's
      "decide what it writes" against this use rather than in the abstract.
- [ ] **Multi-select is not there yet.** `TaskList` tracks a single `selected` id and `Tree` runs in
      `selectionMode='single'`; checkboxes imply a set. Decide whether the checkbox set is selection
      or a second, independent set — a row can be current *and* ticked, and conflating them makes
      "the selected tasks" ambiguous.
- [ ] **Toolbar action over the checked set**, alongside `create-chat`/`add-artifact` in
      `useToolbarActions`, enabled only when the set is non-empty.
- [x] **Verb confirmed: delegate.** The checked tasks are delegated to a new chat session
      (`AssistantOperation.CreateChat` + `Chat.linkCompanion`, the path `create-chat` already
      uses), not deleted. Confirmed 2026-09-01.
- [ ] **Decide what delegation does to the tasks' membership.** They are delegated *to* the chat,
      so settle whether they stay in the task set as well — `Chat.addTask` parents a task it
      creates to the chat, and `Chat.deleteTask` destroys only what the chat owns, so a delegated
      task keeping its set is the shape those primitives already assume.
