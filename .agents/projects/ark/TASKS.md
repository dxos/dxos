# ark — Tasks

_Resume: `Main` port step 1 (machine swap, swipe-to-dismiss on both sides, touch edge swipe-to-open)
implemented 2026-09-09 on this branch; PR #13024 open from it. Next: land it, then step 2 (push layout at
`lg`) as its own PR. Uncommitted: none._

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

- [x] **Use a collapsible disclosure for form objects.** DONE 2026-09-05: `Collapsible`, not
      `Accordion` — each nested object folds on its own and the form owns no set across siblings, so
      there is nothing for an accordion to coordinate. `FormFieldSetContainer`'s bordered box _is_ the
      `Collapsible.Root`, the `FormFieldHeader` row renders as its trigger (`trigger` prop on
      `FormFieldLabel`: a real button, so the fold is keyboard-reachable where the old div `onClick`
      was not) with a caret `Icon` reading `data-state` off it, and the body is `Collapsible.Content`
      with the `fieldSetBody` classes. The hand-rolled `collapsed` state, the `ToggleIconButton` and the
      `expand-fields`/`collapse-fields` keys go. Pinned by `FormFieldSet.test.tsx`.
- [x] Check it against the `Form.Viewport`/`Form.Section` composition — no element added: the
      disclosure reuses the box, header and body the group already rendered.

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
- [x] **Fold `react-ui-tabs` into `react-ui`** DONE 2026-09-05: `components/Tabs` (already Ark's tabs plus
      the master-detail `activePart` focus moves). The one coupling that blocked it — `useAttention`
      choosing the selected tab's button variant — is lifted to a `selectedVariant` prop on `Tabs.Root`;
      plugin-video, the only consumer that passed an `attendableId`, computes `hasAttention` itself.
      14 import sites and 12 manifests/tsconfig references updated; package removed; app-framework's
      package list and the focus/ontology docs follow.
- [ ] **Reconcile the `react-ui` satellite packages: `react-ui-attention`, `react-ui-menu`, etc.**
      (tracked 2026-09-05). `react-ui-attention` and `app-graph` use `react-ui` only as a dev
      dependency (stories), so there is no runtime cycle. The menu split below is the first step;
      decide the target layering for the rest of the family after it lands.
  - [ ] **Menus: inert parts in `react-ui`, action-driven builders in `react-ui-menu`** (design in
        `DESIGN.md`, 2026-09-05; supersedes the same-day "menu split", which it reverts).
    - [x] `react-ui`: one inert `Menu` shaped like `Select` (single `Root`, `Trigger` +
          `ContextTrigger`, `Portal`, `Content`, `Viewport`, items, `Sub`); `DropdownMenu` and
          `ContextMenu` stay as aliases. `DropdownMenu.Entries`, `Toolbar.Entries`,
          `MenuEntriesProvider` and the `MenuEntry` model in `ui-types` removed (`keyBinding` kept).
    - [x] `react-ui-menu`: `ActionToolbar` (whole `Toolbar.Root` driven from `MenuActions`,
          `children` after the graph items, `attendableId` → `Toolbar.Root disabled`) and
          `ActionMenu` (whole `Menu.Root` driven from `MenuActions`, trigger as child, `group` or
          `items`, submenus resolved on open). `onAction` / `caller` / `iconSize` move onto
          `MenuActions` through the source hooks' options; contributions attach to the
          `MenuActions` object (`useMenuContribution(menu, props)`); `Menu.*`, `useMenu`,
          `useMenuScoped` and the context's `attendableId` / `alwaysActive` go.
    - [x] Sweep: 49 `Menu.Toolbar` sites → `ActionToolbar` (2 prepend sites adjusted), 21
          `Menu.Content` sites → `ActionMenu`, the card/column owners put `menu` on their own
          context for the contributors (PipelineArticle, app-toolkit `useObjectMenuItems`).
    - [x] Finding from the sweep: the task rows' menus opened only because the article wrapped its
          panel in `Menu.Root`, which made every row menu an Ark _child_ menu of the article's (a
          `trigger-item`, opening on hover). As top-level menus they need the click the row buttons
          stop, so the buttons are now the triggers (`IconBlock > ActionMenu > IconButton`).
    - [ ] Follow-ups: rename `react-ui-menu` → `react-ui-actions` (own PR, 46 manifests); remove
          the `DropdownMenu` / `ContextMenu` aliases after re-pointing the ~100 part-level sites;
          a data-fed `Select` in `react-ui-list` beside `Combobox`.
- [ ] **Reconcile Ark's anatomy (e.g. `Positioner`) with the Radix-era part names (`Portal`,
      `Content`, `Viewport`)** (tracked 2026-09-05). Today `Content` renders Ark's `Positioner`
      internally, `Portal` re-bridges context across the DOM move, and `Viewport` is the scroll area
      the `Arrow` must stay outside of; `Select` and `Menu` should expose the same surface. Decide
      per floating component whether a Radix-era part stays, folds, or gets Ark's name.
- [x] **StrictMode parity fallout in CI** DONE 2026-09-05: the runner's new `StrictMode` (Phase 4b)
      exposed two defects the dev storybook had been hiding. `useFollow` marked a feed _positioned_ on
      the effect re-run StrictMode issues in the arrival's own tick, so the reserve landing a beat
      later was glided instead of written (`fill/Plain Past End`, `widget/Toggle At Tail`); the flag
      is now earned by the settle pass. Babylon's `AdvancedDynamicTexture` queues an `update()` on
      resize that it never cancels, so the simulated unmount disposed the engine under it
      (`plugin-terra`, five unhandled errors); `createFullscreenUi` guards the deferred call. Plus
      five `sort-named-imports` warnings the `createContext` codemod left, which `denyWarnings` fails.
- [x] **`FloatingPanel` on Ark's floating-panel machine; the debug panel is one** DONE 2026-09-05
      (asked for mid-session). `react-ui` `FloatingPanel` — `Root`, `Trigger`, `Portal`, `Content`
      (renders the machine's positioner around itself, as `Popover` does), `Header`, `DragTrigger`,
      `Title`, `Control`, `StageTrigger`/`CloseTrigger` (icon buttons the machine drives), `Body`,
      `ResizeTrigger`/`Resizers`. The positioner's layer is set inline at the foot of the dialog
      band plus the machine's stack index, because the machine writes `z-index: var(--z-index)`
      inline itself and its `--z-index` is the stack order; the root provides `elevation='dialog'`
      so menus and tooltips inside outrank it. `plugin-debug`'s status rail opens the debug panel
      as one (fold and close only, no maximize), its position and size persisted beside the tab; the
      pin, which only guarded the popover's self-dismissal, goes. `DebugPanel` is parts (`Root`,
      `Tablist`, `Content`) so the tab strip sits in the window's title bar and the panels in its body.
- [x] **Reconcile `Input.Root` with Ark's `Field.Root`** DONE 2026-09-05. Contrast: Ark's field owns
      exactly what `@dxos/react-input` hand-rolled — the ids, `htmlFor`, `aria-describedby`,
      `aria-errormessage`, `aria-invalid`, and the required/disabled/read-only state on label and
      control — plus two things ours lacked (it detects helper and error text by presence, and stamps
      `data-*` state on every part); ours had one thing Ark lacks, the five-way `validationValence`
      the theme colours by. So `Input.Root` is `Field.Root` (a `display: contents` div, since the
      machine watches it for its texts) plus a valence context; `Label` is `Field.Label`,
      `TextInput`/`TextArea` are `Field.Input`/`Field.Textarea`, `Description`/`Validation`/
      `DescriptionAndValidation` keep the old aria swap (the row is the helper text while valid; once
      invalid the description alone is and the validation is the error text) on `HelperText`/
      `ErrorText`; `Checkbox`, `Switch`, `PinInput` and the segmented fields read the field context.
      `Root` gains `required`/`disabled`/`readOnly`/`asChild`/`classNames`. `@dxos/react-input`
      deleted (`PinInput` moved into react-ui).
- [x] **Date pickers opened at the page origin** DONE 2026-09-05 (reported from the `Input` stories;
      the colour-picker pattern again). `Popover.Anchor asChild` merged its id into react-aria's
      `DateField`, which keeps an `id` for its input, so the popover machine found no anchor. The
      pickers anchor through `Popover.VirtualTrigger` at the field element now; the two picker stories
      assert the calendar opens under its field. Sweep of every `asChild` trigger/anchor: the other
      children are buttons, `Icon`, `StatusBar` parts and `composable`s that spread their props.
- [x] **`Fieldset` on Ark's fieldset** DONE 2026-09-05 (asked for after the field work). `Root`
      (a `<fieldset>` whose `disabled`/`invalid` reach every `Input.Root` inside, since the field
      machine reads the fieldset's), `Legend`, `HelperText`, `ErrorText`; the machine wires
      `aria-labelledby`/`aria-describedby` by detecting the texts. `Form.Section` is the first
      consumer: its `h2` is the legend through `asChild`, so the group is named by its title and the
      heading still serves navigation. Stories assert the naming, the description and the disabling.
- [ ] **Rename `Stepper` → `Steps`** (tracked 2026-09-05): Ark's name for the machine the component
      sits on, and the family convention is Ark's name where the part is Ark's. Own PR with the
      `Input` → `Field` codemod, or folded into it.
- [ ] **Replace `react-joyride` with Ark's `Tour`** (tracked 2026-09-05): the onboarding walkthrough
      keeps a second floating stack and its own spotlight/step machine; Ark's tour machine gives the
      steps, the spotlight and the positioning on the same popper the rest of the library uses.
      Establish first which `react-joyride` features the walkthrough actually relies on (scrolling
      to a target, the beacon, controlled step state) and whether Ark's tour covers them.
- [x] **Implement Ark's table of contents (`toc`)** DONE 2026-09-09 (user asked the same day, after
      deferring it): `react-ui` `Toc` — Root/Content/Nav/Title/List/Indicator/Item/Link on Ark's toc
      machine, Tailwind theme, play stories for scroll-activation and link-click scrolling. See
      `react-ui/docs/MIGRATION.md` Phase 7b.
- [ ] **`Toc` consumer**: the machine observes DOM headings with ids, so rendered markdown fits and
      the CodeMirror editor does not; `react-ui-feed`'s `Outline` is a tick rail over document
      offsets, a different thing. First candidate: `rehype-slug` on `MarkdownView` and a `Toc.Nav`
      beside it.
- [x] **Transcription `Pipeline/Live` story lost its mic** DONE 2026-09-06 (reported). Not the
      toolbar: the story's own graph extension registered at startup, its connector called
      `getDefaultSpace` on a client with no runtime yet and threw before subscribing to anything
      reactive, so it never re-ran and the document node never existed for the transcription
      extension to match. The module now activates on `ClientEvents.SpacesReady`; the story's play
      asserts the record control is in the editor toolbar. `plugin-review`'s comments story guards
      the same connector with an `initialized` check that returns nothing and expects a re-run a
      non-reactive read cannot cause — likely the same latent race, left for its owner.
- [x] **A navtree row's ⋮ menu selected the row** DONE 2026-09-06 (reported): Ark's tree item selects
      on any click inside it, and selecting navigates, which unmounts the menu just opened. The
      dropdown trigger stops the click after the menu machine has taken it, as the row's single
      action button and the task rows already do. The `NavTree/RowMenu` story pins it, counting
      `LayoutOperation.Open`; the fixture's objects gained `data` (the navtree navigates only for a
      node that carries some) and their actions the `list-item` disposition (what puts them on the
      row's menu), so the story's rows finally have menus.
- [x] **A field root strands its parts in a Column grid** DONE 2026-09-06 (reported from the Dialog
      story): the grid places direct children by `--dx-col`, and `Input.Root` is now a box-less
      element between the grid and the input. The root's theme class hands the column to its parts
      (`[&>*]:[grid-column:var(--dx-col,auto)]`), a no-op outside a Column.
- [x] **Playground fieldset-per-elevation story** DONE 2026-09-06: one small fieldset on each surface
      of the elevation ladder, with invalid and disabled variants; now the `Elevation` playground story.
- [x] **Deleting an item in Composer threw `Tooltip.Trigger must be used within Tooltip`** DONE
      2026-09-06 (reported): Ark toasts render in the viewport, not where their roots sit, and the theme
      plugin's context rendered `Toast.Viewport` beside its `Tooltip.Provider`, so the undo toast's close
      button had no provider. The viewport moved inside the provider; `react-context.test.tsx` renders a
      closable toast through the plugin's context and fails without the move.
- [x] **Rename `Input` → `Field`** DONE 2026-09-08 (see Phase 17) (own PR, a codemod over ~900 sites: `Root` 443, `Label` 215,
      `TextInput` 119, `Switch` 40, `Checkbox` 25, `DescriptionAndValidation` 22, `Validation` 13,
      `TextArea` 12, `Description` 11, `PinInput` 4). Proposed names follow Ark where the part is
      Ark's: `Field.Root`, `Field.Label`, `Field.Input` (`TextInput`), `Field.Textarea`,
      `Field.HelperText` (`Description`), `Field.ErrorText` (`Validation`), `Field.RequiredIndicator`
      (new); ours keep theirs: `Field.Checkbox`, `Field.Switch`, `Field.PinInput`, `Field.Date`/
      `Time`/`DateTime`, `Field.TriggerIcon`, `Field.Block`. `DescriptionAndValidation` folds into
      `HelperText` + `ErrorText` as siblings once the aria swap is retired — a field is either
      described or in error, and Ark already points the control at each.
- [ ] **`react-ui-form` on `Field` consistently.** `FormRow` passes `required`/`disabled`/`readonly`
      to the root so the label and control carry the state (today only the valence reaches it);
      `FormFieldLabel` renders `Field.Label` whenever a control exists and the `standalone` span only
      for group headers; `Input.Description` becomes the helper text without the swap; the field
      renderers that open their own roots (`RefField` per item, `GeoPointField` ×2, `InlineRefField`,
      `FormLayout`, `ViewEditor`) get reviewed for which state they should forward. Decide
      `Field.RequiredIndicator` against the CSS asterisk — the asterisk keeps the label's
      `textContent` exactly the label, which `getByLabelText` depends on.
- [ ] **Review each `react-ui` component's theme against Ark's anatomy** (tracked 2026-09-05, e.g.
      Tabs): the port kept the Radix-era slot names and selectors where they mapped one-to-one, so
      each `*.theme.ts` should be checked for parts Ark adds or renames (`indicator`, `positioner`,
      `data-selected` vs `data-state`) and for styles that no longer attach to anything.
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

## Phase 17: Normalize react-ui, react-ui-form and Ark anatomy (2026-09-08)

The session's goals, in order: (1) normalize react-ui's field primitives on Ark — `Input` is Ark's
`Field` under another name, `Fieldset` is new; (2) normalize react-ui-form on those primitives
rather than on divs; (3) review Ark's structural parts (`Positioner`, `Content`, `Viewport`, `Portal`)
against the Radix-era names react-ui kept, Popover first.

- [x] **`FormFieldSetContainer` and `Form.Section` on `Fieldset`** DONE 2026-09-08: every group in
      a form is a `<fieldset>` named by its `<legend>` (a nested object's legend holds the
      disclosure); react-ui's legend is floated so it lays out as an ordinary child, which is what
      lets a flex-column fieldset keep it in flow. `Form.Section`'s legend was inside a header
      `div`, so it never named the group; it is the fieldset's first child now. Story
      `react-ui-form/FormFieldSet` asserts the groups by role and name in both variants;
      `react-ui-form/docs/DESIGN.md` carries the react-ui-form → react-ui → Ark mapping table.
- [x] **Names say what things are** DONE 2026-09-08: `FormField` (a factory that picked a renderer
      per schema property) is `FormFieldDispatch`, with the decision extracted as the pure
      `resolveFieldRenderer` (tested by kind); `Form.Row` is `Form.Field` — one label + control is a
      field, and a field set holds fields. 150 call sites across 17 plugins renamed.
- [x] **Phase 18 — the form ontology** DONE 2026-09-08 (PR #13003; #12998, the design note alone, was closed in its favour; see the notes below the steps; design in
      `packages/ui/react-ui-form/docs/DESIGN.md`; one PR after #12998 lands, core + sweep):
  1. `Form.FieldSet` is chrome only (`label`, `description`, `collapsible`; depth from context; border
     from the theme variant and depth); `Form.Section` and `Form.Group` deleted.
  2. `Form.Fields` walks the schema (`path`, `include`, `exclude`, `sort`, `filter`), resolved from
     the root; a nested object renders `Form.FieldSet` + `Form.Fields`.
  3. `Form.Field` is one `Field.Root` row: `path` binds, else `label`/`description`/`error` props;
     `standalone` for no-single-control rows; `useFormField()` for a custom control inside a bound row.
  4. The dispatcher renders the row; the renderers become controls.
  5. In-package consumers, stories, tests. 6. The sweep: 83 rows, 68 sections, 2 groups, 86 field
     sets, 14 `fieldMap` and 5 `fieldProvider` sites. `Form.List` and `Form.Root path` are follow-ups.
     Notes: a `fieldMap`/`fieldProvider` renderer owns its row (most customise the row), so a reused
     built-in control sits in `<Form.Field path={jsonPath}>`; a control with several labelled inputs
     declares `standalone` on the component (`GeoPointField`, `TupleField`, `SelectOptionField`).
     Observation: under vitest's parallel story run, react-ui-form logs three
     `useSelectItemPropsContext returned undefined` console errors (none serially, none on main);
     every story passes. Likely a portal torn down across files; worth a look if it recurs.
- [ ] **`Form.Field` in action mode is not a field** (absorbed by Phase 18 step 3): a hand-written settings row (Debug and most
      settings panels) renders a bare `div`, so its label and description are not field parts.
      Render every row through `Input.Root` (a `Field`) and give hand-written rows the same
      `fieldSet` gap as the schema path (reported from Deck vs Debug settings, 2026-09-08).
- [ ] **`Form.Group` is a styled `div`**; it should be a `Fieldset` too.
- [x] **`Input` → `Field`** DONE 2026-09-08: the namespace, its files, theme key and context are
      `Field`; parts take Ark's names (`HelperText`, `ErrorText`, `Input`, `Textarea`);
      `DescriptionAndValidation` dropped (helper and error are two parts, as in Ark); 133 files
      codemodded. Decision recorded: `Field.*` holds the wrapper parts plus the standard, field-wired
      form of every control (`Field.Checkbox` is the flat one, like Ark's own `Field.Input`), and
      composite anatomies (`Checkbox.*`, `Switch.*`) are added only when a consumer needs a part.
- [x] **`Field.Checkbox` / `Field.Switch` take label children** DONE 2026-09-08: with children the
      root is a `<label>` around control and text (Ark's checkbox anatomy for the checkbox, a plain
      label for the switch), so a labelled control is one element; 13 hand-built
      `Field.Root > Flex > control + Field.Label` rows collapsed. Left-label settings rows (label
      column, control column) keep `Field.Root` + `Field.Label`, which is the right form for them.
      The `Field/Checkbox` and `Field/Switch` stories click the text; jsdom cannot toggle a controlled checkbox from
      a synthetic click, so the node test asserts labelling only.
- [x] **`DropdownMenu`/`ContextMenu` aliases removed** DONE 2026-09-08: 25 consumer files across
      16 packages moved to `Menu` (`ContextMenu.Trigger` → `Menu.ContextTrigger`); the module is
      `Menu/Menu.tsx` + `MenuContext.ts`, display names and story titles follow, the alias type
      exports are gone. Every consumer package typechecks; Menu, MenuButton, Card and Toolbar
      stories pass.
- [x] **Goal 3: floating anatomy reviewed** DONE 2026-09-08: the mapping table and rules are in
      `DESIGN.md` ("Floating anatomy"). `Positioner` stays inside `Content`, `Viewport` is the bounded
      region inside it, `Portal` stays a part, `Dialog.Overlay` is the backdrop with content nested.
      One `usePositioning` hook now builds the machine's `positioning` for Popover, Menu (and its
      helpers for Select), replacing two copies of the placement/boundary/virtual-anchor block;
      `PlacementOptions` is one type; `Menu.Content` gains `hideWhenDetached` and loses the unused
      `constrainBlockSize`. Positioners default `--x`/`--y` off screen and a virtual anchor is the
      machine's anchor element (scroll-following), both from the dx-anchor popover report.
- [ ] `plugin-sheet:test-storybook` fails on CI shard 2 with a `Missing file` during teardown while every test passes (seen twice on #12971 and #12987, 2026-09-06 and 2026-09-08); rerun passes. Track the cause or quarantine.
- [ ] `plugin-illustrator:test` runs ~570s on a CI runner (six diagrams through ELK candidate sweeps in `corpus.test.ts`, 83s locally) and was killed at moon's 600s cap on every run of #12987; main raised the task's timeout to 1800s (#12985) as the same stopgap. Make the corpus compile cheaper or run it outside the sharded job.

## Phase 19: `Drawer` on Ark, and `Main` re-probed (2026-09-09)

Asked for on 2026-09-09: react-ui components for Ark's `drawer` and `toc`, and whether `Drawer` can
reimplement `Main`. Toc deferred (user, same day); the Main port is a follow-up (user chose probe +
verdict over porting in the same PR).

- [x] **`Drawer` component** DONE 2026-09-09: `Root` (`side`, `modal`, snap points), `Trigger`,
      `Portal`, `Overlay`, `Content` (positioner folded in), `Grabber`, `Title`, `Description`,
      `Close`, `SwipeArea`; theme + `drawer.css` keyed on the machine's `data-swipe-direction`;
      stories `Default`/`Side`/`BottomSheet`/`NonModal` + two play tests. Verified through the vitest
      storybook browser and screenshots of all five variants (the 9009 storybook was serving a
      deleted worktree and could not be replaced from this session). Finding: a fraction snap point
      is a fraction of the **viewport**, capped by the content's extent — short content shows no snap.
- [x] **Push mode** DONE 2026-09-09 (asked for after the overlay landed): `Drawer.Root push` renders
      the panel as a flex item that pushes its neighbours, width following the drag through
      `--dx-drawer-size ± --drawer-translate-x`; `Push` story = start + end drawers around a
      `Panel` (toolbar, content, statusbar) with `Toolbar.IconButton` toggles; `TestPush` asserts
      the main panel takes the closed drawer's width back. BUG FOUND: Zag's dismissable layer stack
      dismissed the sibling drawer when the first closed (later layers count as nested);
      `onRequestDismiss` now vetoes cross-layer dismissal in `Drawer.Root`. This also removes the
      remaining reason `Main` could not sit on the drawer at `lg` — push is the expanded-sidebar case.
      Sizing a pushed drawer (asked 2026-09-09): nest, do not merge — the `Push` story's inspector sits
      in a `Splitter` end pane (`anchor='end'`, `mode={open ? 'split' : 'start'}`) with
      `--dx-drawer-size: 100%` and `draggable={false}`; the seam owns the width in rem and the
      collapse, the drawer keeps the dialog semantics. Reopening restores the dragged size. A
      `Drawer.Handle` of its own was the alternative and was not taken.
      Two fixes fell out (2026-09-09): the Splitter sized panes as percent `flex-grow` and the
      machine re-derived the anchored share a frame after a container resize, so a neighbour
      animating its width made the seam jiggle — `Splitter.Panel` now carries a fixed rem
      `flex-basis` (longhands, since Ark merges `style` key by key) while split; and a pushed
      drawer's `--dx-drawer-size` must be a length, never `100%`, or the children's anchor width
      shrinks with the box. `TestPushCollapse` samples both frame by frame; the Browser pane's
      document is `hidden`, which stalls CSS animations, so exit-animation checks belong in vitest.
      Later the same day: a pushed box in a grid host hangs from the page edge (`justify-self`), or
      it grows from the inner edge and the content is revealed instead of sliding in; the drag
      offset is a registered `@property` and the only thing push mode transitions, so a seam drag
      lands at once; and a drawer open at the root's first render carries `data-instant` (the
      machine's own `data-state` outlives the presence's `skipAnimationOnMount`), which the enter
      keyframes skip.
      One clock for a drawer in a split pane: push-mode slides run 250ms ease-out, the Splitter's
      collapse timing; the Splitter flips `animating` during render (an effect-set `transition`
      arrived a commit after the sizes and animated nothing) and lifts the pane's `minSize` while
      animating (it snapped from `0%` to `12rem` and held a growing pane at 192px); the child
      anchor is `!important` because a child's own `min-w-0` (ScrollArea) sits in the utilities
      layer and beat it.
      REBUILT (user: "rethink this logic"): push mode is now clip + sheet on Ark's anatomy — the
      positioner is the clip (`--dx-drawer-size * --dx-drawer-open`, a registered number easing
      0↔1), the content a fixed-size sheet at the clip's inner edge, mounted while closed (inert,
      aria-hidden). No child anchoring, no `!important`, no keyframes; the sheet slides in from
      beyond the edge because the clip opens from the edge. Lesson: never make one box both the
      clip and the sheet.
      Two more reasons a sheet stands still while its clip opens, both found by per-frame geometry
      in vitest (the Browser pane's document is hidden and freezes CSS motion): the machine's own
      enter slide (`--drawer-translate-x` = content size on open, eased to 0) exactly cancelled the
      clip's opening — cancelled on the sheet; and an `overflow: hidden` clip is a scroll container,
      which the machine's open-focus scrolled to the sheet's far end — `overflow: clip`.
      `TestPushCollapse` now asserts the sheet rides the clip's inner edge and travels.
      Knobs (asked 2026-09-09): `Drawer.Root transition` (ms, default 250, sets
      `--dx-drawer-duration` on the clip) and `Drawer.Content size` (rem) match `Splitter.Root`'s
      `transition`/`size`; the Push story holds both as module constants (500ms, 30rem) and feeds
      the seam and both drawers from them.
- [x] **Material-style `elevation` (0–5)** DONE 2026-09-09 on Panel (all parts), Toolbar, Card,
      Dialog.Content, Popover.Content: the prop maps onto the existing ladder in
      `ui-theme/css/theme/surfaces.css` (0 sunken … 5 popup) by setting `data-surface`, which the
      CSS already turns into background + ink + re-derived aspects; `surface.css` adds the level's
      shadow for raised/overlay/popup. Helpers `elevationSurface`/`elevationAttrs` in ui-theme,
      types `Surface`/`ElevationLevel` in ui-types. A part with an explicit level drops its default
      surface class (a toolbar paints its own level even inside a Panel slot). Panel's `Elevation`
      story walks the ladder; `TestElevation` asserts distinct monotonic tones and the shadows.
- [x] **`Main` on the drawer machine — probe** DONE 2026-09-09. The 2026-09-05 verdict ("fights the
      inset slide") was wrong: the machine's inline `transform` and `main.css`'s `inset-inline-start`
      are independent properties, and a driven touch swipe dismissed the sidebar through
      `onOpenChange` with the inset slide finishing the exit. Findings and the port's shape are in
      `react-ui/docs/MIGRATION.md` Phase 7. The probe story lives in git history one commit and is
      deleted from the tree.
- [x] **Port `Main`'s sidebars to the drawer machine — step 1, machine swap** DONE 2026-09-09.
      `useDialog` → `useDrawer` below `lg`; `useSwipeToDismiss` deleted, both sidebars swipe to dismiss
      (`swipeToDismiss`, on by default, → content `draggable`); `swipeToOpen` (on by default) renders the
      machine's swipe area, touch-only; the sibling-layer dismiss is vetoed as in `Drawer.Root`. API,
      three-state model, `main.css` geometry and deck CSS untouched. Pinned by `Main.stories.tsx`
      (dismiss both sides, snap back, swipe to open); deck + navtree stories pass. Details in
      `react-ui/docs/MIGRATION.md` Phase 7.
- [ ] **`Main` step 1 — touch check on a device (WKWebView)**: swipe-to-dismiss, edge swipe-to-open
      and its interaction with the OS back-swipe on the left edge. Cannot be done by the agent.
- [ ] **`Main` step 2 — push layout at `lg`** (own PR): a flex row of clip-and-sheet on `Drawer push`;
      delete `dx-main-content-padding` / `dx-main-intrinsic-size` / `--main-sidebar-width`; move
      `useMainSize`, `focus.css` `data-sidebar-*-state` and the `DeckViewport` vars onto the clips;
      decide the rail (collapsed = `Drawer.Content size` switching rail↔sidebar).
- [x] **`Toc`** DONE 2026-09-09; the consumer question stays open in Phase 16's toc item.
