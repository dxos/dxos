# List & Selection surfaces — next-steps roadmap

Date: 2026-06-14
Status: living. Tracks the deferred work after PR #11814 (`feat(react-ui-list): aspect
hooks + Radix-style compounds`) landed on `main` as commit `2b92dfb35a`.

Lives in `react-ui-search` because the remaining work converges on search-domain consumers
(`SearchList`, `SearchStack`, `Combobox`, `Picker`) once the lower layers settle — but the
items below span `react-ui-list`, `react-ui-mosaic`, `react-ui-stack`, and the plugin call
sites.

## What landed in PR #11814

- **Aspect layer** (`@dxos/react-ui-list/src/aspects/`): `useListNavigation`,
  `useReorderList`/`useReorderItem`, `useReorderAutoScroll`, `useListDisclosure`,
  `useListSelection`, `useListGrid`. One implementation per cross-cutting concern;
  callable from any package.
- **`OrderedList` rebuilt** on aspects. New `Viewport` (ScrollArea + auto-scroll for drag),
  new `IconButton` slot, new `selected` / `onClick` props, six story variants (Simple /
  Scrollable / Draggable / CheckboxWithDelete / DraggableWithToggle / Nested).
  `OrderedListDetailItem` uses `ring-1` instead of `border` (kills the `my-[1px]` nudge).
- **`RowList` merged into `Listbox`**. Single canonical compound for the picker / option-
  list pattern; optional `Viewport` covers full-pane vs popover usage. New `Indicator` slot
  for the confirmatory checkmark.
- **Deprecated `List` deleted** (AUDIT.md Phase 6 complete). Four consumers migrated:
  `RangeList` (plugin-sheet), `Mixer` (plugin-zen), `SelectOptionField` (react-ui-form),
  `ToolList` (react-ui-mcp).

Design doc: `docs/superpowers/specs/2026-06-13-react-ui-list-aspects-design.md`.
Audit + grammar: `packages/ui/react-ui-list/AUDIT.md`.

## Where we are now

```
                    ┌──────────────────────────────────────────┐
   Heavy /          │  react-ui-mosaic                         │
   feature-rich     │    Stack, VirtualStack, Tile, Board      │   ← still uses Focus.Group
                    │    pragmatic-dnd (own monitor)           │     + own DnD wiring
                    └──────────────────┬───────────────────────┘
                                       │ depends on
                    ┌──────────────────┴───────────────────────┐
                    │  react-ui-list                           │
                    │    Listbox (single-select picker)        │
                    │    OrderedList (reorderable + expand)    │
                    │    Tree, Accordion, Combobox, Picker     │   ← Tree / Combobox / Picker
                    │    aspects/ (shared behaviour)           │     still pre-aspect
                    └──────────────────┬───────────────────────┘
                                       │ depends on
                    ┌──────────────────┴───────────────────────┐
                    │  react-primitives/react-list             │
                    │    role=listbox / role=option            │
                    │    aria-selected / aria-multiselectable  │
                    └──────────────────────────────────────────┘
```

```
            ┌──────────────────────────┐
            │  react-ui-search         │
            │    SearchList (composes Picker)
            │    SearchPanel, SearchStack, Listbox-wrapper
            └──────────────────────────┘
```

Not in the diagram: **`react-ui-stack`** — legacy `Stack` / `StackItem*`. Its own PLAN.md
already says "replace with Mosaic.Stack". Still imported by ~6 plugins.

## Roadmap

Items are sized to land in independent PRs. Each is shippable on its own.

### Phase A — Correctness cleanup (small, do first)

#### A1. Fix `dx-*` mismatches (AUDIT.md §4)

- `react-ui-search/SearchStack.tsx:103` — `dx-current dx-hover dx-selected` on a tile that
  has no matching ARIA attributes. Either add the ARIA (`aria-current` for the active tile)
  or drop the classes. Recommend: add `aria-current="true"` paired with `dx-current`.
- `react-ui-mosaic/DefaultStackTile.tsx:31` — `dx-current dx-hover` with no ARIA. Same fix.
- Any remaining `dx-active` strings in the tree: delete (the class is undefined). Last
  audit flagged `react-ui-introspect/ToolList`'s first draft; verify it's gone now.

Estimated: one tiny PR, no behaviour change.

#### A2. `Mosaic.Stack` keyboard nav → `useListNavigation`

`Mosaic.Stack` itself has no internal keyboard wiring; `Focus.Group` is applied by
consumers (`SearchStack`, `Board.Column`, the Stack story). Migrate those consumers to
`useListNavigation({ mode: 'list' })` where the surface is "a sequence of items the user
arrow-keys through". Keep `Focus.Group` for non-sequence focus zones (multi-pane chrome,
toolbar/composer surrounding). Retires the second Tabster wrapper for list-shaped surfaces.

Estimated: one PR, ~3-4 file changes. Low risk.

### Phase B — Plugin-list migrations (parallelisable)

#### B1. Ad-hoc plugin lists → `Listbox` (AUDIT.md §6 backlog)

~9 plugin call sites still rolling their own `<ul>`/`<li>` + `<button>` rows:

| File                                                                 | Replacement                                              |
| -------------------------------------------------------------------- | -------------------------------------------------------- |
| `plugin-code/src/components/FileTree/FileTree.tsx`                   | Reuse `react-ui-list/Tree` (after C1)                    |
| `plugin-sidekick/src/components/ActionItems.tsx`                     | `Listbox` + a per-row checkbox affordance (multi-select) |
| `plugin-assistant/src/components/ChatPrompt/ChatReferences.tsx`      | `Listbox` (tag-pill row variant)                         |
| `plugin-assistant/src/components/ChatPrompt/ChatMcpErrors.tsx`       | `Listbox`                                                |
| `plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx` | `Listbox`                                                |
| `plugin-help/.../WelcomeTour.stories.tsx`                            | `Listbox`                                                |
| `plugin-meeting/src/containers/MeetingsList/MeetingsList.tsx`        | already on `Listbox`; drop the inner `<div role='list'>` |
| (one more in plugin-script)                                          | `Listbox`                                                |

Each is a small PR; parallelise across maintainers. High aggregate value (consistent
`dx-selected` grammar), low per-PR risk.

#### B2. Resolve `plugin-sidekick/ActionItems` against the multi-select gap

`ActionItems` is a checkbox-toggle row pattern (`completed: boolean`). `useListSelection`
already supports `mode: 'multi'` at the aspect level, but no compound exposes the toggle
affordance yet. Either:

- Wait for B1 to expose a concrete multi-select consumer here, then add a compound surface
  to `Listbox` (e.g. `Listbox.Item checkable`), or
- Use `Input.Checkbox` inside a `Listbox.Item` (as the existing `CheckboxWithDelete`
  OrderedList story does) and skip `useListSelection({ mode: 'multi' })` for now.

Pick the cheaper option once B1 lands and the call-sites are visible.

### Phase C — Lower-layer aspect migrations (medium-large, sequence)

#### C1. `Tree` → aspects

Refactor `react-ui-list/Tree` to compose:

- `useReorderList` + `useReorderItem` for hierarchical DnD (above / below / into via
  pragmatic-dnd's `attachClosestEdge` + a `canDrop` predicate that reads `depth`).
- `useListDisclosure({ mode: 'multi' })` for multi-branch expand state.
- `useListGrid` for the row template; `gridTemplateColumns` + `renderColumns` props become
  the aspect's slot conventions. Land a `legacy gridTemplateColumns` escape hatch on
  `Tree.Root` first so the navtree migration is non-blocking; remove the escape hatch in a
  follow-up.

Affects:

- `plugin-navtree` (6 files — `state.ts`, `L1Panel`, `types.ts`, `NavTreeContainer`,
  `useNavTreeModel`, `update-state.ts`)
- `devtools/ObjectsTree.tsx`
- `sdk/app-graph/EchoGraph.stories.tsx`
- `sdk/app-toolkit/object-node.ts` (type-only)

Estimated: 1 PR for the aspect refactor + back-compat prop, then 1 PR per navtree/devtools
migration, then 1 PR to drop the `legacy` prop. Medium-large; deserves focused review.

#### C2. `Combobox` / `Picker` → aspects

`Combobox` currently wraps `Picker`; `Picker` owns its own listbox keyboard pattern
(registry, virtual highlight, ↑↓/Home/End/Enter/Escape). Migrate the keyboard wiring onto
`useListNavigation({ mode: 'listbox' })` + a filter aspect (`useListFilter` — contract is
in the design doc, not yet implemented). Selection stays on `useListSelection`.

`SearchList` (in `react-ui-search`) composes `Picker`. Should fall through with no API
changes once `Picker` migrates.

Estimated: 1 PR for the aspect addition (`useListFilter`), 1 PR for the `Picker` migration,
1 PR for `Combobox` + `SearchList` follow-through if needed. Medium.

#### C3. `Mosaic.Stack` and `Mosaic.VirtualStack` → `useReorder`

The big one. `Mosaic.Stack` (non-virtual) maps cleanly onto `useReorderList` — see the
call-site sketch in the aspect design doc. `Mosaic.VirtualStack` is gnarlier: the
interleaved-placeholder logic (count = `items.length * 2 + 1` when draggable) needs to
live inside the (still-unimplemented) `useListVirtualizer` aspect so consumers don't
re-derive it.

Sequence:

1. Implement `useListVirtualizer` with the `{ reorder }` slot from the design doc.
2. Migrate `Mosaic.Stack` to `useReorderList` (no virtualization). Cross-stack drag stays
   via `canDrop`/`getInitialData` payloads.
3. Migrate `Mosaic.VirtualStack` to `useReorderList` + `useListVirtualizer`.

Estimated: 3 medium PRs. Highest-risk follow-up.

### Phase D — Theme work (consumer-driven)

#### D1. Density variants

The token surface in `Listbox` / `OrderedList` is designed to absorb a `density: 'compact'
| 'cozy' | 'comfortable'` prop without API churn — add a `tx('list.*')` variant axis when
a real density spec exists across the design system. Don't ship unilaterally; the
breakpoints should be informed by Composer's existing density patterns (Settings, NavTree,
Stack).

Estimated: not yet ready to schedule.

#### D2. Multi-select compound surface

`useListSelection({ mode: 'multi' })` works; no compound exposes it. Concrete blocker:
`plugin-sidekick/ActionItems` (B2). Don't add the compound API speculatively — wait for
the call-site to settle B2 first.

### Phase E — Retire `react-ui-stack`

#### E1. `react-ui-stack` → `Mosaic.Stack`

Cited in this package's own `PLAN.md` for some time: "TODO(burdon): Replace with
Mosaic.Stack which handles this automatically." Still ~6 consumers (plugin-deck,
plugin-script, plugin-stack, plugin-meeting). Independent of the aspect work above.

Strands:

1. Each consumer migrates to `Mosaic.Stack`. Per-consumer PR; can parallelise.
2. After consumer count hits zero: delete `packages/ui/react-ui-stack/` entirely (source +
   `PLAN.md` + dependencies + tests).

Estimated: 1 PR per consumer (~6) + 1 deletion PR.

> **TODO: retire `react-ui-stack` (legacy stack predating `react-ui-mosaic`).** Owner:
> unassigned. Replacement is `Mosaic.Stack` per `packages/ui/react-ui-stack/PLAN.md`.
> Convert remaining consumers first, then delete the package.

## Recommended sequence

Starting from least risk → most value:

1. **A1, A2** — small correctness cleanups; can land same day.
2. **B1** — parallelise ad-hoc list migrations across maintainers. Land as they come.
3. **C1** — Tree refactor when there's appetite for a focused review.
4. **E1** — `react-ui-stack` retirement; independent track; can run concurrently with B1.
5. **C2** — Combobox/Picker once Tree is settled (validates `useListFilter`).
6. **C3** — Mosaic adoption once Stack consumers (`SearchStack`, `Board`) have been audited.
7. **D2** — multi-select compound surface, only when a consumer asks.
8. **D1** — density variants, only when there's a design spec to ground them in.

## Open questions

- Should `react-ui-list` rename? `Listbox` (pick) + `OrderedList` (edit) + `Tree` +
  `Accordion` + `Combobox` + `Picker` is "list / picker / disclosure surfaces" rather than
  literally "lists". Worth re-asking after C1 lands.
- Does Mosaic's `Tile` adopt the `Listbox.Item` / `OrderedList.Item` row styling, or stay
  visually distinct? Resolved when C3 lands.
- `react-ui-search`'s `Listbox` wrapper (currently composes `RowList` → now `Listbox`): is
  it still useful? If not, delete in a follow-up to C2.

## References

- `docs/superpowers/specs/2026-06-13-react-ui-list-aspects-design.md` — aspect-layer design
  this roadmap extends.
- `packages/ui/react-ui-list/AUDIT.md` — full inventory + grammar rules.
- `packages/ui/react-ui-stack/PLAN.md` — the original retirement plan for E1.
