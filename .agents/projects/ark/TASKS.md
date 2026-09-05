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
- [x] **Retired `dnd.ts` and the flat path.** Every mode renders through `Tree`, so `TaskListItem`
      and the drag machinery it owned (`useTaskDrag`, `subtreeRows`, `renderSubtreePreview`) were
      unreachable: `dnd.ts` is deleted and `TaskList.tsx` drops from ~1,520 to 1,005 lines.
      `walkTaskTree`/`TaskTreeRow` went with it — ordinals now flatten the same forest the tree
      renders (`flattenVisibleTasks`), so the numbers cannot drift from the rows they label, and the
      walk's tests moved onto it. `hierarchy.ts` keeps only its placement algebra, which
      `TaskTreeContent` uses. `TaskList.Item`/`GroupLabel` left the namespace; nothing consumed them.

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

## Phase 13: Checkbox selection, and delegating the selected tasks

Tracked 2026-09-01; merged with the ProjectArticle toolbar action 2026-09-02. A `TaskList` option to
render a checkbox where the ordinal sits, and a `ProjectArticle` toolbar button that delegates the
checked tasks to a new chat session.

**The checkbox is selection, not a status write** — settled 2026-09-02. It does not complete a task,
which is what the status control is for; it marks which rows an action will act on. Selection lives
in `react-ui-attention`'s view state (`useSelection('multi', contextId)` and
`useSelectionActions().toggle`, over `Selection.toggle`), so the rows and the toolbar read and write
one set and neither owns it.

- [x] **Render the checkbox in the gutter cell**, where `TaskOrdinal` sits, not beside the status
      control: the two would read as two ways to complete a task, and the row keeps one geometry so
      the trailing columns do not move. `TaskCheckbox` in `TaskRowCells.tsx`; `TaskTreeHeading`
      renders it INSTEAD of the ordinal, and `showGutter` now also reserves the track for it.
- [x] **`TaskList` keeps its own `selected` string; the checked set is a second, independent one.**
      Settled 2026-09-02: the current row is where the reader is (the roving tabstop's highlight,
      what `Edit` follows), and the checked set is what an action acts on. A row is routinely both,
      and collapsing them would mean arrowing down a list silently changed what a toolbar button
      would do. `Tree` keeps `selectionMode='single'`; the checkbox is a `checked`/`onTaskCheck`
      pair the host owns, and the row's click handler never sees it (the box stops propagation).
- [x] **Key the view state per list.** `contextId` is the TASK SET's object id, not the attendable:
      the attendable is the plank, so a project's embedded list and a task-set plank beside it would
      share a set. `useCheckedTasks` in both `TaskSetArticle` and `ProjectArticle` keys off it.
- [x] **The checkbox is offered when a `TasksCapabilities.TaskAction` exists**, rather than
      configured by the host through Surface data — which Phase 15 was removing at the same time.
      With nothing contributed to act on the set, the box is an affordance that does nothing.
- [x] **`ProjectArticle` contributes the toolbar action** beside `create-chat` in
      `useToolbarActions`, disabled (present, not absent) while the checked set is empty, and
      clearing the set once the chat is open.
- [x] **Delegate, not delete** (confirmed 2026-09-01): `AssistantOperation.CreateChat` +
      `Chat.linkCompanion`, the path `create-chat` already uses.
- [x] **Delegation leaves membership alone.** Settled 2026-09-02, and it is what the code already
      did: `Chat.tasks` is a plain ref array, so a delegated task keeps the task set it came from —
      the chat works on it, it does not take it. `Chat.deleteTask` destroys only what the chat owns,
      so nothing the chat did not create is at risk. The operation's own docstring claimed the
      opposite (`SetParent`); corrected, and the test that already asserted the parent survives is
      now the record.
- [x] **`DelegateTaskToChat` takes an ordered list**, guarded non-empty by the handler rather than by
      `Schema.NonEmptyArray` — that serializes to `prefixItems`, which the persisted-operation JSON
      schema does not carry (`serialize.test.ts` is what caught it). The row's own menu action passes
      a one-element one — one write path for both. Order is the list's VISIBLE row order (the
      `flattenVisibleTasks(buildTaskForest(...))` walk), not tick order: `Selection.toggle` appends,
      so the toolbar re-orders at the point of use. N tasks produce ONE chat; it is named after the
      task only when there is exactly one, since a chat holding three cannot be about the first.
- [x] Story coverage: `TaskList.WithCheckboxes`/`TestCheckboxSelection` (the cell and that checking
      is not a status write), `TaskSetArticle.Checkboxes` (offered off the capability, keyed per
      set), and `ProjectArticle.DelegateCheckedTasks` (disabled → check two rows out of order →
      one chat holding both in row order → cleared).

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

## Phase 15: `ProjectArticle` stops passing behaviour through Surface data

Tracked 2026-09-02. The outline Surface is handed `extensions` and `onSelectTask` as `data`, which
the file already flags: `// TODO(burdon): Should not pass callbacks!`. Surface data describes the
subject; it is not a props channel, and a callback there couples the host to the implementation it
is supposed to be decoupled from.

- [x] **Collect the editor extensions in `plugin-tasks`, where the surface is implemented**, not in
      `ProjectArticle`. `OutlineArticle` reads `MarkdownCapabilities.ExtensionProvider` itself, as
      `MarkdownArticle` does for markdown documents; the `extensions` prop and the host's
      `outlineExtensions` are gone. The standalone outline article gains them as a side effect —
      it never had them, and there was no reason for the embedded case alone to decorate links.
- [x] **Removed `handleSelectTask` and the `onSelectTask` data property**, and the `onSelectTask`
      prop on `OutlineArticle` with it. **Behaviour change:** following a promoted item's link
      inside the project's Overview now swaps that section for the task's form (the outline's own
      standalone behaviour) and Back returns, where the callback used to switch the host's tab to
      Tasks. `ProjectArticle.TaskLink` asserts the new path.
- [ ] **Follow-up: re-route the promoted link to the Tasks tab through something the host owns.**
      The tab is `ProjectArticle`'s state, so the outline has to reach it through an operation or
      the layout rather than a function handed down as Surface data. Tracked 2026-09-02.
- [x] `subject`, `attendableId` and `taskSet` stay on the Surface: those identify what is being
      rendered, which is what `data` is for.
- [x] The tasks section's Surface was already clean — `{ subject: taskSet, attendableId }`, no
      callbacks. Phase 13's checkbox is gated on a contributed capability rather than on a data
      property for the same reason.

## Phase 16: Migrate `@dxos/react-ui` from Radix to Ark — planned

The plan is [packages/ui/react-ui/docs/MIGRATION.md](../../../packages/ui/react-ui/docs/MIGRATION.md)
(commit `8a81160f5b`): a 42-row component inventory, the Radix→Ark primitive map with its gaps, the
Radix modules every sibling package depends on, and six landable phases. This phase is the ledger for
it; the reasoning stays in the doc. The `react-ui-list` core (`Combobox`, `Listbox`) is deliberately
**not** absorbed here: that is this ledger's own Phase 4 (deferred wider adoption), which still holds
the open evaluation, and the migration doc lists them only as candidates outside `react-ui` — the
doc's Phase 4 is Dialog/Main, Toast and Select, a different thing.

Findings that shaped the plan, so they are not re-derived:

- Of ~230 `@radix-ui` imports under `packages/ui`, ~207 are scaffolding (`react-context`,
  `react-primitive`, `react-slot`, `react-compose-refs`, `react-use-controllable-state`) that 28
  sibling packages and 28 plugin/app/sdk files share. Ark publicly exports only `createContext`,
  `mergeProps`, `ariaAttr`, `dataAttr` and the `ark` factory — `composeRefs` and
  `useControllableState` are internal — so the scaffolding has to be owned in-repo, and that is
  independent of any behavioural port.
- Only 12 of 42 `react-ui` components wrap a Radix behavioural primitive; `Popover` (701 LOC),
  `Tooltip` (942) and `Menu` (896) are forks that compose `popper`/`dismissable-layer`/
  `focus-scope`/`presence`/`portal` directly. They are the expensive ones and the largest deletion.
- `Calendar` and `DatePicker` are built on `react-aria-components`, not by hand, and RAC also backs
  `Input`'s date/time fields and `react-ui-form`'s `DateField`. Consolidating it is a decision, not a
  port. The four genuinely hand-built components with Ark machines are Carousel, Editable, Splitter,
  Stepper.
- Ark exposes `Positioner` and has no `Viewport`; Radix hides the positioner and exposes
  `Select.Viewport`. Our `Popover.Viewport`/`Tooltip.Viewport` are ours (arrow-clipping rationale in
  `Popover.theme.ts`) and survive. 95 `--radix-*` variable sites across 12 files map onto one generic
  Zag set (`--reference-width`, `--available-height`, …); 20 of them are aliasing blocks that delete.
- `Select` is the one API leak: Ark's takes a required `collection: ListCollection<T>` — 44 consumer
  files.
- Maintenance, 2026-09-02: both projects are one maintainer (Radix 95% single-committer, Ark 56%);
  Radix had a 296-day release gap ending 2026-06-06, Ark's worst is 56 days; Radix has ~68× the
  downloads.

- [x] **Phase 0 — port Carousel, Editable, Splitter, Stepper to Ark.** Landed 2026-09-03 as #12902
      (`react-ui: rebuild Carousel, Editable, Splitter and Stepper on Ark UI`); ~2,264 LOC; consumers
      4 / 13 / 8 / 3; `@ark-ui/react` is now a `react-ui` dependency (catalog).
      **Overnight run, decided 2026-09-05 (user, 1x1):** attempt Phases 1 → 2 → 3 → 4a in order, one branch
      (`claude/react-ui-ark-port-fe9f63`), one draft PR opened after Phase 1 and rewritten per phase, merge
      `origin/main` at every phase boundary. Stop at the first phase that cannot go green; commit what is.
      Excluded: Toast (model change), Calendar/RAC cluster, retiring the `Toolbar.*` namespace, Phase 6.
      Decisions: boot budget trips → re-baseline by the measured delta with the dated justification and the
      number at the top of the PR body; Select keeps the children API (collection built internally) and
      MIGRATION.md records moving to Ark's `collection` as a later phase; `Input.Checkbox` → Ark (DOM becomes
      label + native input, ref type → input); `Input.Switch` and `PinInput` stay hand-built, MIGRATION.md
      records `pin-input` as a later phase; `ToggleGroup` keeps the single/multiple API via an adapter;
      **Toolbar is pulled into Phase 2** — `Toolbar.Root` on a `@dxos/react-focus` group, `Toolbar.ToggleGroup`
      over Ark `toggle-group`, namespace kept; `Slottable` in Tooltip and ScrollArea → restructure, no shim;
      all long suites (full build, full test, composer build + budget, Playwright e2e) pre-authorised; the
      composite-components skill, MIGRATION.md status lines and this ledger are updated as phases land;
      **every phase ends with the storybook render check** — the vitest storybook project of every touched
      package, console errors counted as failures (user, 2026-09-05).

- [x] **Phase 1 — own the scaffolding.** Done 2026-09-05 on this branch. `@dxos/react-hooks` owns
      `composeRefs`/`useComposedRefs` (over the existing `mergeRefs`), `useControllableState` (Radix
      signature, uncontrolled `onChange` reported post-commit so updaters resolve through React),
      `createContext` (Radix signature, no scope) and `composeEventHandlers`, with tests. `Primitive.*` + `Slot` → `ark.<tag>` from `@ark-ui/react/factory` in 45 files; the seven scoped contexts nobody
      ever scoped (react-list ×2, react-input, grid, menu, syntax-highlighter, shell Viewport) are plain
      contexts — `create*Scope`, `*ScopedProps` and the `__*Scope` props are gone. The five Radix
      scaffolding packages plus `-id` and `primitive` left 46 package.jsons; `react-ui` keeps
      `react-context`/`-slot`/`-primitive` for the forks only (Tooltip, Popover, DropdownMenu,
      ContextMenu, ScrollArea untouched — they go with Phases 2–3). Doc'd in the composite-components
      skill and `slots.ts`. The plugin-level `@radix-ui/react-tooltip`/`-toolbar`/… imports the plan
      mentions no longer existed in `src` — only composer-app's package.json listed six Radix packages
      with no import; `react-slot` was the one this pass could drop, the rest wait for Phase 6.
- [x] **Phase 2 — leaves.** Done 2026-09-05 (commits 2f58623d5f, 2ff04eccc4, d248f761cd, b533d002cd).
      Order, one commit each, gated on build + the touched packages' unit and storybook tests: Separator (hand-rolled `role="separator"`) → Toggle + ToggleGroup (adapter keeps
      the single/multiple API: `single` maps `value` ↔ `[value]`) + **Toolbar** (`Root` = `useFocusGroup`
      with the orientation as axis, `memorizeCurrent`, `cyclic`; `role="toolbar"` kept; Button/IconButton/
      Toggle/Link wrappers become pass-throughs since react-focus takes any focusable; `ToggleGroup` runs
      `rovingFocus={false}` under the bar; the 196 `Toolbar.Root` consumers change nothing) →
      `Input.Checkbox` (Ark `checkbox`: `Root(label) > Control > Indicator` + `HiddenInput` carrying the
      `Input.Root` id and aria; `react-list`'s `CheckedState` type decoupled from Radix) → `react-list`
      Collapsible (Ark `collapsible`; only the story consumes the parts) → `react-ui-tabs` (Ark `tabs`;
      `[data-state="active"]` → `[data-selected]`; `Tabs.TabPrimitive` stays an alias of the Ark trigger)
      → Slider (adapter keeps `value: number[]` / `onValueChange(number[])`; `thumbLabels` → Ark's
      `aria-label[]`) → ScrollArea last (real rewrite: Ark `scroll-area` replaces the 250-line
      `ScrollAreaThumbs` measurer; `Slottable` goes because the thumbs render inside `Root` beside the
      viewport; options `autoHide`/`thin`/`padding`/`centered`/`snap`/`native` stay as theme props).
      **Verdicts revised on inspection, 2026-09-05:** Progress, Avatars and Clipboard are NOT ported —
      Progress is countdown/error/rewind semantics the `progress` machine has no notion of; Avatar's
      content is the lit `DxAvatar` element, so Ark's image-fallback machine has nothing to own;
      Clipboard is a ten-line context plus two buttons. Recorded in MIGRATION.md.
      **Found doing it:** (1) an Ark checkbox toggles through label activation, which any ancestor
      `preventDefault()` on click cancels in Chromium and happy-dom does not emulate — the react-ui-task
      story caught it; the control now clicks the input itself and is pointer-focusable so focus does
      not jump to the tree row (which re-renders the row under the click). (2) Ark's slider hides its
      thumbs (`visibility: hidden`) until it has measured them — pass `thumbSize` or every
      `getByRole('slider')` fails. (3) Ark's tabs have no per-panel `forceMount`; `keepMounted` on
      `Tabs.Root` replaces it. (4) `pnpm install` while a moon test run is spawning vite yanks the
      binary from under it (`spawn vite EACCES`); never install during a run.
      **Phase 3 Tooltip design (found 2026-09-05, before starting):** the DXOS Tooltip is not a Radix copy but
      a single-provider design — one `Tooltip.Provider`, one content node, N `Tooltip.Trigger content= side=`
      (47 consumers), a virtual anchor moved to the active trigger, and `Tooltip.test.tsx` pins two invariants:
      only the active trigger carries `aria-describedby`/`data-state`, and hovering one trigger re-renders no
      other. Zag's tooltip machine (1.43) has native multi-trigger support (`triggerValue`, `ids.trigger(value)`,
      active-trigger positioning), which fits the shape — BUT Ark's `Tooltip.Trigger` component subscribes every
      trigger to machine state (all re-render on hover) and Zag stamps `aria-describedby` and `data-state=open`
      on every trigger of the machine, not just the current one. So: keep our own trigger element (imperative
      attributes as today), give it `id = value` so `ids.trigger = (value) => value` lets the machine find it,
      drive the machine through `setTriggerValue`/`setOpen`/`reposition({ placement: side })` from the existing
      delay/skip-delay logic, and take Ark's `Positioner`/`Content`/`Arrow`+`ArrowTip` + `interactive` content
      hover in place of popper/dismissable-layer/presence and the 150-line grace-area hull. `onInteract` (the
      TextTooltip truncation veto) gates the open in the provider. Deletion is smaller than the guide's 942
      LOC suggests; the win is the content layer, not the trigger logic.

- [x] **Phase 3 — the forks.** DONE 2026-09-05. Tooltip DONE 2026-09-05 (see design above): `Tooltip.Provider` is one
      `useTooltip` machine with `ids.trigger = (value) => value`, our own `ark.button` trigger delegating
      pointer/blur/click to `api.getTriggerProps({ value })` at event time (so no trigger subscribes),
      imperative `aria-describedby`/`data-state` on the active trigger as before, Ark `Positioner` /
      `Content` / `Arrow`+`ArrowTip` in a `Portal`, `interactive` content hover from the machine. The
      positioner's inline `z-index: var(--z-index)` outranks any `z-*` class, so the theme sets the
      variable (`[--z-index:50]`) instead; the arrow is painted from `--arrow-background`. `Tooltip.test.tsx`
      (4) and a new `TestHover` play story (opens, positions at the trigger, hands over) pass. Gone:
      `@radix-ui/react-tooltip`, `-visually-hidden`, the `TooltipScopedProps`/`createTooltipScope` exports,
      the grace-area hull. `useSafeCollisionPadding` now types its padding itself (`CollisionPadding`).
      Popover DONE 2026-09-05: `Popover.Root` = `usePopover` + `RootProvider lazyMount unmountOnExit`
      (Ark's presence keeps closed content mounted-hidden before the first open unless `lazyMount`; Radix
      never mounted it — a play story caught the difference). `Content` lifts placement (`side`/`align`/
      `sideOffset`/`alignOffset`/`collisionPadding`/`collisionBoundary`/`avoidCollisions`/`hideWhenDetached`)
      to the root as state and the dismissal/focus handlers as a ref, since Ark keeps both on the root;
      `onOpenAutoFocus` is asked at render (every consumer only ever calls `preventDefault()`), which sets
      the machine's `autoFocus`. `VirtualTrigger` registers a ref the root turns into
      `positioning.getAnchorRect`; the `[data-popover-collision-boundary]` ancestor becomes
      `positioning.boundary`; the safe-area padding collapses to its widest side because Zag's
      `overflowPadding` is one number. `Viewport` reads `--available-*` (Zag sets them on the positioner);
      `--radix-popover-content-transform-origin` → `--transform-origin` (2 consumers), the Combobox's
      `--radix-popover-trigger-width` → `--reference-width`; `sticky` dropped (1 consumer). New
      `surfaceZIndexVar` in ui-theme feeds the positioner's `--z-index`. Play stories: open/place/Escape,
      virtual anchor. Gone: `aria-hidden`, `react-remove-scroll`, `createPopoverScope`.
      Menu DONE 2026-09-05: `DropdownMenu` and `ContextMenu` are one implementation (`DropdownMenu.tsx`,
      `ContextMenu.tsx` deleted) over Ark's `menu` machine — `Menu.Root` for both, `Trigger` vs
      `ContextTrigger`, `Sub` = nested `Menu.Root` + `TriggerItem` (the machine parents it itself),
      `Content` lifts placement to the root as Popover does; `lazyMount unmountOnExit`; `typeahead`.
      **Selection is the item's own click**, not the machine's `onSelect`: Zag's `invokeOnSelect` reads
      `highlightedValue` from React-state-backed context, and a click that lands before React commits the
      pointerdown's highlight (which `userEvent.click` right after open does) finds it null and selects
      nothing — an afternoon of Zag instrumentation to find. Keyboard Enter still works because the
      machine clicks the highlighted element. `closeOnSelect={false}` and the item closes the root unless
      its cancelable `onSelect` event was `preventDefault()`ed (Radix contract kept). `modal` accepted,
      no-op. `MenuButton`, `react-ui-menu` and the 20-odd consumers compile unchanged. Play stories:
      DropdownMenu select, ContextMenu, MenuButton select. Gone: `@radix-ui/react-menu`,
      `-dropdown-menu`, `-context-menu`, `-popper`, `-dismissable-layer`, `-focus-scope`, `-focus-guards`,
      `-presence`, `-portal`, `createDropdownMenuScope`. Radix left in `react-ui`: `react-dialog`,
      `react-alert-dialog`, `react-select`, `react-toast` (Phase 4).
      **Boot budget tripped at the Phase 3 boundary (2026-09-05):** 4,565,469 bytes, 4,164 over the 4.35 MB
      ceiling; re-baselined to 4.55 MB per the decision above. Sourcemap attribution (`scratchpad/attribute.mjs`
      over `out/boot-budget.json` with `@jridgewell/trace-mapping`) puts the whole ~78 KB delta from Phase 2 on
      the Zag floating stack (`menu` 25.7 KB, `focus-trap` 12.8, `tooltip` 9.7, `popover` 7.7, `popper` 6.9,
      `dismissable` 5.6, `presence` 3.7, `interact-outside` 3.2, `aria-hidden` 1.9, `remove-scroll` 1.1), while
      the ~19 KB Radix floating stack stays in the graph via `react-select`/`react-dialog`/`react-toast` until
      Phase 4 — so Phase 3 is the point of maximum duplication. Bring the ceiling back down after Phase 4a.
      **Tooling trap (2026-09-05):** an install that swaps binaries under a running moon build leaves
      tasks cached as successful with an EMPTY `dist/types` (dx-compile's type emit died, the lib emit
      did not); every later full build then fails downstream with `Could not find a declaration file for
module '@dxos/x'` while `x:build` reports "cached". Cure: find packages with `dist/lib` but no
      `dist/types/src` and `moon run <pkg>:build --force` each, then rebuild. UPDATE: it recurred on every full build
      for `types` and `react-ui-list` even after forced rebuilds, with dx-build logging `Failed to remove
dist/types/src: ENOTEMPTY` — a concurrent writer. A Cursor TypeScript native-preview server
      (`tsc --lsp`, pid seen in `ps`) runs against this worktree, and those two packages are the ones
      whose files the user has open; the working assumption is that it emits into `dist/types` and leaves
      a buildinfo that makes dx-build's incremental tsc emit nothing. Mitigation used for the rest of the
      run: `scratchpad/repair-types.sh` (find buildinfo-only `dist/types`, delete, force-build) before and
      after every full build. CI is unaffected. **Actual cause found:** `.moon/workspace.yml` sets
      `cache.unstable_sharedWorktreeCache` — one output CAS per machine shared by every worktree — so a
      task whose inputs hash matches an archive produced by ANOTHER worktree (with a buildinfo-only
      `dist/types`, however that build lost them) hydrates that archive here on every full build, and a
      local `--force` does not replace it. Fix: `moon --cache write exec :build` once, which rewrites
      every archive from fresh outputs. Tooltip → Popover → Menu. Add `Positioner`, keep our `Viewport`,
      `Arrow` → `Arrow`+`ArrowTip` (`fill-separator` → `--arrow-background`), rename the five
      variables, delete the three aliasing blocks, collapse DropdownMenu + ContextMenu onto one
      `menu` machine, retire the 116 `__scope*` props. Removes ten Radix packages plus `aria-hidden`
      and `react-remove-scroll`.
- [x] **Phase 4a — Dialog + Main, Select.** DONE 2026-09-05. `Dialog` and `AlertDialog` are one
      implementation (`DialogRootImpl` with `role`) over Ark's dialog machine, `lazyMount unmountOnExit`;
      `Overlay` is Ark's `Backdrop` with the content nested inside it, since all 27 consumers nest
      `Content` in `Overlay` and Ark's separate `Positioner` would have changed every one — the backdrop's
      own presence also runs the exit animation Radix's Presence ran. `Content` lifts its dismissal/focus
      handlers to the root as Popover does; `onOpenAutoFocus` and `onCloseAutoFocus` are asked at render
      (`initialFocusEl` → the `data-dx-autofocus` control, else the content when vetoed; `restoreFocus`).
      Zag's `checkRenderedElements` sets `aria-labelledby`/`aria-describedby` only for a rendered
      `Title`/`Description` (play story pins the no-description case). `AlertDialog`: `role='alertdialog'`,
      `closeOnInteractOutside: false`; `Cancel`/`Action` are `CloseTrigger`. `modal={false}` maps to
      `modal`/`trapFocus`/`preventScroll` off. `Dialog.Description` stays a `<p>` (Ark's default is a div).
      `Main`'s sidebars keep the dialog machine (`useDialog` directly, `modal: false`, `aria-label` from
      `label`, `open` only below `lg`) with `hidden={false}` on the content so the always-mounted sidebar
      keeps its CSS slide; pointer-opened sidebars keep focus where it is by handing the machine
      `document.activeElement` as `initialFocusEl` (Zag always focuses something). **Ark `drawer`
      evaluated and NOT used:** its machine positions and animates the content itself (translate,
      snap points), which would fight `main.css`'s inset-driven slide, and at `lg` the sidebar is not a
      dialog at all — a mobile bottom sheet is a feature of its own, not this port.
      `Select` keeps the children API: each `Item`/`Option` registers `{ value, text, node, element }`
      with the root, which builds `createListCollection` from the entries in document order; `Value`
      renders the selected entry's `node` (Radix's `ItemText` behaviour — the icon in `SelectField`
      survives). Consequence: the content stays mounted hidden while closed (Radix kept it in a detached
      fragment), or nothing would register. Root's element is `display: contents`. `onValueChange` is a
      method signature (a consumer typed it for a narrower union). `Arrow`, `ScrollUpButton`,
      `ScrollDownButton` deleted and removed from 28 consumer files (Zag scrolls the highlighted item
      into view). `--radix-select-*` → `--reference-width`/`--available-height`; z-index via the
      positioner variable. Play stories: Dialog open/labelled/described/Escape, no-description +
      autofocus, AlertDialog outside click + Cancel, Select pointer + keyboard past a disabled option,
      Main toggle. Radix left in `react-ui`: `react-toast` only (Toast excluded from this run).
      Boot budget after 4a: 4,547,849 bytes (−17,620 from Phase 3), ceiling left at 4.55 MB until Toast
      evicts the Radix layer. Gates: full build, 34-package storybook sweep (SearchDialog's FTS play story
      timed out under the 2-wide sweep, passes alone in 2 s), react-ui unit tests, lint of the 18 touched
      packages, knip, format.
- [x] **Phase 4b — Toast.** DONE 2026-09-05. Ark's toast is a store plus a `Toaster` host; the
      declarative API the nine consumers use is kept: `Toast.Provider` owns `createToaster` (bottom-end,
      overlap — a pile that expands under the pointer, as Ark's demo (user, 2026-09-05), `overlap={false}`
      on the provider for rows — 8px gap, offsets via `--dx-toast-offset-end` so `md` widens the end inset) and a
      `ToastRegistry` (an external store, so a root re-registering each render re-renders the viewport
      alone, not the app under the provider); `Toast.Root` renders nothing where it stands — it registers
      `{ children, classNames, props, ref, countdown }` and mirrors `open` into the store (`create` with
      its own id / `dismiss`), with `onStatusChange('dismissing')` reported back as `onOpenChange(false)`;
      **Store calls are deferred to a microtask:** Zag's React binding `flushSync`s when the store
      publishes, which React refuses inside an effect ("flushSync was called from inside a lifecycle
      method", 72 per run). Hygiene, not the phantom-slot fix — the slot reproduced on 8ee1fe6662 (remove
      on unmount) and not on e55eeabd87 (dismiss on unmount) with the same seven-toast script, which is
      now `TestPileClosesRanks`. Lesson recorded: verify a repro fails on the old code before crediting a fix.
      **StrictMode (the real remaining break, found 2026-09-05 by driving the user's tab through the
      Chrome extension):** storybook renders under StrictMode, so effects run mount → cleanup → mount;
      the root's cleanup dismissed the toast it had just created, so with dismiss-on-unmount NO toast
      ever appeared in the dev storybook while the runner (no StrictMode) passed. Deferred store calls
      now consult an `alive` ref, so only a real unmount dismisses. `TestStrictMode` wraps the stack in
      `StrictMode` in the runner. Verified in the live tab: toasts appear; closing the middle closes ranks.
      **Runner parity (2026-09-05):** the vitest storybook project now defines `FRAMEWORK_OPTIONS`
      `{ strictMode: true }` in `vite.base.config.ts`, so it renders under StrictMode like the dev server
      (a `setProjectAnnotations` decorator does not reach the renderer). Effect-count probe reads 2; the
      Toast module without the alive guard fails two stories in it. Swept react-ui (61 files) and 38 of
      40 consumer packages green; the one StrictMode-exposed defect found, `HtmlViewer`'s disposed flag
      never reset on remount, is fixed. Toast stories rationalized to five (Default with args, Stacked
      with an `overlap` control, TestLifecycle, TestPile, TestClosesRanks).
      A root that unmounts while visible is `dismiss`ed, not `remove`d: removing drops the actor before
      it retires its height from the pile, which left a phantom slot between survivors (seen 2026-09-05).
      `Toast.Viewport` is Ark's `Toaster`, rendering each registered root inside the machine's actor so
      `Title`/`Description`/`Close`/`Action` find their toast and the countdown reads `paused` from it.
      `duration: Infinity` persists (Zag honours it). `title: true` on create so the root carries
      `aria-labelledby`. `type` and `Action.altText` accepted, no-op. Positioning and the enter/exit
      motion are the machine's inline variables transitioned by `ui-theme/css/components/toast.css`
      (the `toast-*` keyframes and `--radix-toast-swipe-*` are gone). Removed `@radix-ui/react-toast`
      and `tailwindcss-radix` (its only user). Play story: open from state, labelled by title, closed
      from the action, both changes reported. `react-ui` now imports nothing from `@radix-ui`.
      Boot budget after 4b: 4,546,844 bytes, no `@radix-ui` bytes in the graph; ~186 KB above main's
      2026-08-31 figure (4,360,490) — the Zag machines are the new floor, ceiling stays 4.55 MB.
      Lockfile: 31 `@radix-ui` versions gone (~1.9 MB built), rest via tldraw/excalidraw/leva (Phase 6).
      Also: `playground/Playground.stories.tsx` — a section per component family (buttons, text fields,
      controls, select, slider, progress, tags, avatar, skeleton, navigation, editable, collapsible, card,
      banner, overlays, dialogs), each its own story plus `All` composing them, under a sticky bar that
      sets the accent hue (overriding the accent role tokens on the subtree) and density.
- [x] **Replace `react-qr-rounded` with Ark's QR code** DONE 2026-09-05: `QrCode` in `react-ui`
      (`@ark-ui/react/qr-code`, `errorCorrection` → uqr `ecc`, pattern in `currentColor`); the three
      usages (shell invitation, space members, client devices) keep their centred emoji as a sibling.
      Visual change: square modules, no rounded dots and no reserved centre cut-out — the emoji sits on
      the modules, which ECC `Q` tolerates. Package gone from four manifests and the catalog.
- [ ] **Fold `react-ui-tabs` into `react-ui` and remove the package** (tracked 2026-09-05): Tabs is on
      Ark already; it belongs beside the other core components. Consumers change one import.
- [ ] **Fold `react-ui-menu` into `react-ui` and remove the package** (tracked 2026-09-05): the
      action-graph menu wrappers (`useMenuActions`, `Menu.Root`, `ToolbarMenu`, `DropdownMenu`) sit
      on `react-ui`'s Menu; one package fewer in the boot graph's dependency chain.
- [ ] **Phase 5 — decisions.** RAC (keep for the date/time cluster vs consolidate onto Ark; default
      keep); Toolbar (no Ark toolbar — focus group from `@dxos/react-focus` + `toggle-group`); Focus
      (keep as the seam).
- [x] **Phase 6 — remove `@radix-ui/*` from the catalog** DONE 2026-09-05: 36 `@radix-ui/*` entries plus
      `aria-hidden`, `react-remove-scroll` and `tailwindcss-radix` removed from `pnpm-workspace.yaml`; no
      manifest declared any of them. The 226 lockfile entries left are transitive to tldraw, excalidraw
      and leva and stay with them. knip clean.
- [x] **Re-organize `react-ui/src/primitives`** DONE 2026-09-05: `providers/` (Density, Elevation,
      Theme), `layout/` (Container, Flex, Grid, `layout.ts`), `flow/` (Show, Switch — structural
      rendering, no anatomy). Barrels unchanged for consumers; story titles follow the folders.
- [ ] **Storybook icon sprite first-load gap** (tracked 2026-09-05, not the port's). The dev server
      assembles the page's icon sprite from the modules it has scanned, so a story's first load can
      receive a sprite (99 symbols) that lacks that story's own icons — `Toggle` showed a blank
      button for `ph--text-b--regular` — and the runtime fallback 404s because `/phosphor` is
      deliberately not served (`tools/storybook-react/.storybook/main.ts`). A reload gets the full
      sprite (143). Fix belongs in the icons plugin: scan the story module before answering the
      sprite request, or serve the fallback in dev.
      **Second symptom (2026-09-05, playground):** after a `pnpm install` ran under the live server, its
      sprite (`tools/storybook-react/static/icons.svg`) stopped being rewritten at all — stuck at 99
      symbols while newly loaded stories' icons (all valid Phosphor names) never appeared, across
      reloads and a re-transform of the story. A fresh server (the vitest storybook runner) builds the
      sprite correctly (109 symbols, every icon present), so the plugin's write path wedges when
      `node_modules` is relinked beneath it (watcher/asset stat on replaced symlinks is the suspect).
      Recovery is a server restart; a durable fix would re-stat assets on each write and resubscribe
      the watcher after the assets directory is replaced.
- [ ] **Separate, not this phase: touch drag in the Tree.** `pragmatic-drag-and-drop` is native
      HTML5 DnD, which does not fire from touch in iPhone WKWebView, so Tree reordering is
      desktop-only under Tauri mobile. Library-independent; verify on device first. Tracked
      2026-09-02, unowned.
