# List & Selection Components — Audit and Rationalization Plan

Status: draft. No code changes proposed in this branch — this document is the deliverable.

Scope: every "list-shaped" component layer in `packages/ui/*` plus consumer
patterns in `packages/plugins/*` and `packages/apps/composer-app`. Tables
(`react-ui-table`) are explicitly out of scope.

## 1. Why this audit

Composer is a data-driven app whose dominant UI primitive is "a list of
things you can pick from." Today there are at least six places to start
when you need one:

1. `@dxos/react-ui-list` — `List`, `Tree`, `Accordion`.
2. `@dxos/react-ui-mosaic` — `Stack`, `VirtualStack`, `Tile`, `Board`.
3. `@dxos/react-ui-stack` — older linear stack with rails / keyboard nav.
4. `@dxos/react-ui-search` — `SearchList`, `Listbox`, `Combobox`,
   `SearchStack`.
5. `@dxos/react-primitives` — a `react-list` primitive (purely structural,
   listbox/option ARIA only).
6. Ad-hoc `<ul>`/`<li>` + `<button>` (incl. the `ToolList` added in
   `react-ui-introspect`).

The result is duplication, ARIA / `dx-*` class mismatches (see §4), and no
clear answer to "where do I start when I need a list?". This document
inventories the surface, decides which package each layer should live in,
and proposes a phased migration.

## 2. Facets

Per the brief, "list-like" is parameterized along:

- **Layout** — row vs card.
- **Reorderable** — draggable / sortable items.
- **Virtualized** — supports thousands of items.
- **Navigation** — `aria-current` ("you're here") semantics. Click reads
  as "go to."
- **Selection** — `aria-selected` semantics. The row is "the chosen one"
  driving a master/detail panel.
- (Multi-select, keyboard nav follow from the above.)

Mapping packages to facets up front:

| Package / Component                  | Row | Card | Drag | Virt | Nav (current) | Sel (selected) | Multi-sel | KbdNav |
| ------------------------------------ | :-: | :--: | :--: | :--: | :-----------: | :------------: | :-------: | :----: |
| react-primitives `react-list`        |  ✓  |   —  |   —  |   —  |       —       |        ✓ (ARIA only) | ✓ (`aria-multiselectable`) |   —    |
| react-ui-list `List` (deprecated)    |  ✓  |   —  |   ✓  |   —  |       —       |        —        |     —     |   —    |
| react-ui-list `Tree`                 |  ✓  |   —  |   ✓  |   —  |       ✓       |        —        |     —     |   ✓    |
| react-ui-list `Accordion`            |  ✓  |   —  |   —  |   —  |       —       |        —        |     —     |   ✓    |
| react-ui-mosaic `Stack`              |  ✓  |   ✓  |   ✓  |   —  |       ✓       |  via `Focus`    |  via `Focus` |  partial |
| react-ui-mosaic `VirtualStack`       |  ✓  |   ✓  |   ✓  |   ✓  |       ✓       |  via `Focus`    |  via `Focus` |  partial |
| react-ui-mosaic `Board`              |  —  |   ✓  |   ✓  |   —  |       ✓       |        —        |     —     |   —    |
| react-ui-stack `Stack` (legacy)      |  ✓  |   ✓  |   ✓  |   —  |       —       |        —        |     —     |   ✓    |
| react-ui-search `Listbox`            |  ✓  |   —  |   —  |   —  |       —       |        ✓        |     —     |   ✓ (tabster) |
| react-ui-search `SearchList`         |  ✓  |   —  |   —  |   —  |       —       |        ✓        |     —     |   ✓ (custom) |
| react-ui-search `SearchStack`        |  —  |   ✓  |   —  |   ✓  |       ✓       |        ✓        |     —     |   partial |
| ad-hoc plugin lists (×9)             |  ✓  |   —  |   —  |   —  |  inconsistent |   inconsistent  |     —     |   —    |
| `ToolList` (react-ui-introspect)     |  ✓  |   —  |   —  |   —  |       —       |        ✓        |     —     |   —    |

Headline reads as: virtualization + DnD + cards live in `react-ui-mosaic`;
ARIA-correct selection (Listbox/SearchList) lives in `react-ui-search`;
drag-and-drop *trees* live in `react-ui-list`. Plain selectable rows are
duplicated across at least four call sites.

## 3. Inventory

### 3.1 `@dxos/react-ui-list`

- `List/*` — drag-and-drop list using
  `@atlaskit/pragmatic-drag-and-drop`. Source-marked **deprecated**
  ("Use react-ui-mosaic"). Still imported by 3 plugins
  (plugin-meeting, plugin-automation, plus tests).
- `Tree/*` — hierarchical drag-and-drop tree backed by
  `@dxos/react-ui` `Treegrid`. Active. ~6 plugin call sites
  (plugin-navtree dominates).
- `Accordion/*` — `@radix-ui/react-accordion` wrapper. Active and
  unique (no equivalent elsewhere).
- Styling: `dx-selected` + `dx-hover` on `ListItem` paired correctly
  with `aria-selected` (the only call site in the audit that's right).
- No virtualization, no selection grammar above `aria-selected`.

### 3.2 `@dxos/react-ui-mosaic`

- `Mosaic.Root` — DnD coordinator (pragmatic-drag-and-drop).
- `Mosaic.Container` — scrollable, tracks `currentId` (navigation).
- `Mosaic.Tile` — draggable card with idle/preview/dragging/target
  state.
- `Mosaic.Stack` — flex linear layout of tiles.
- `Mosaic.VirtualStack` — `Stack` + `@tanstack/react-virtual`. The
  high-water mark of the package; ~6 plugin call sites
  (plugin-feed, plugin-inbox, plugin-assistant, plugin-search,
  plugin-deck Matrix).
- `Mosaic.Board` — multi-column layout prototype.
- `Mosaic.Focus` — selection / current-id context.
- Heavy deps: `@tanstack/react-virtual`, multiple `pragmatic-dnd`
  variants, `@codemirror/state`+`view` (via Board), `@fluentui/react-tabster`.

This is the modern story. It's also the heaviest layer to pull in.

### 3.3 `@dxos/react-ui-stack` (legacy)

- `Stack` + `StackItem*` (heading / drag-handle / resize-handle / sigil).
- Implements rails, intrinsic/contain/split sizing, custom
  cross-stack keyboard navigation, and pragmatic-dnd reordering.
- `PLAN.md` says: "TODO(burdon): Replace with Mosaic.Stack which handles
  this automatically."
- Still imported by plugin-deck, plugin-script, plugin-stack,
  plugin-meeting (~6 files).

### 3.4 `@dxos/react-ui-search`

- `Listbox` — minimal `role="listbox"` + `role="option"` selection list
  with `aria-selected`. Keyboard nav via `@fluentui/react-tabster`
  arrow group. Comment in source explicitly calls itself out as an
  "exemplar of `List` specifying standard `role='listbox'`
  interactivity" — i.e., it knows it's solving the same problem as
  `react-primitives/react-list`.
- `Combobox` — `Listbox` + input + filtering.
- `SearchList` — composite `Root`/`Content`/`Input`/`Viewport`/`Item`
  with debounced `onSearch`, auto-select first result, smooth
  scroll-into-view. The most polished selectable list in the repo.
- `SearchStack` — Mosaic-backed virtualized card stack with `Focus`.
  Three different `dx-*` classes co-located on a tile that has no
  ARIA backing them (see §4).

### 3.5 `@dxos/react-primitives` `react-list`

- `List` (`role="listbox"` when `selectable=true`,
  `aria-multiselectable` when configured), `ListItem` (`role="option"`
  + `aria-selected`), `ListItemHeading`, `ListItemOpenTrigger`,
  `ListItemCollapsibleContent` (Radix Collapsible).
- Pure structure / ARIA. No styling, no keyboard nav.
- **Zero consumers**. Source file carries a TODO to reconcile with
  `react-ui-list`.

### 3.6 Ad-hoc plugin lists

Nine call sites where a plugin rolls its own list with `<ul>`/`<li>`
and inline `<button>`:

| File                                                                                | Rough purpose                |
| ----------------------------------------------------------------------------------- | ---------------------------- |
| `plugin-code/src/components/FileTree/FileTree.tsx`                                  | File tree (most sophisticated of the bunch — `aria-expanded`, depth indent). |
| `plugin-sidekick/src/components/ActionItems.tsx`                                    | Todo list with checkboxes.   |
| `plugin-meeting/src/containers/MeetingsList/MeetingsList.tsx`                       | Wraps `react-ui-list` `List.Root` but with a custom `<div role='list'>` inner layer. |
| `plugin-assistant/src/components/ChatPrompt/ChatReferences.tsx`                     | Tag pills.                   |
| `plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx`                | Template list.               |
| `plugin-assistant/src/components/ChatPrompt/ChatMcpErrors.tsx`                      | Error list.                  |
| `plugin-help/.../WelcomeTour.stories.tsx`                                           | Demo.                        |
| `react-ui-introspect/src/components/ToolList/ToolList.tsx`                          | MCP tool browser.            |
| (one more in plugin-script)                                                         | —                            |

These are universally:
- Row layout, no virtualization, single-select.
- ~half pair `aria-selected` with `dx-selected` correctly; the rest are
  inconsistent.
- None reach for `react-primitives/react-list`, even though it would
  fit.

## 4. `dx-*` utility class audit

Definitions live in `packages/ui/ui-theme/src/css/components/{selected,focus}.css`
and `utilities.css`.

| Class           | Bound selector              | Notes                                                  |
| --------------- | --------------------------- | ------------------------------------------------------ |
| `dx-hover`      | `hover:`                    | Cursor + hover bg/text. No ARIA dependency.            |
| `dx-highlighted`| `data-[highlighted]:`       | Radix highlighted state. **No call sites in audit.**   |
| `dx-current`    | `aria-[current=true]:`      | Highlight bg + ring pseudo (`dx-ring-pseudo`).         |
| `dx-selected`   | `aria-selected:`            | Selected bg + text + bold + tracking transition.       |
| `dx-ring-pseudo`| `::after` ring scaffolding  | Used by `dx-current`.                                  |
| `dx-focus-ring*`| `:focus-visible:`           | Many variants — overlay, group, main, etc.             |
| `dx-active`     | **not defined**             | Used in code anyway (notably `ToolList`'s first draft) — the class is a no-op. |

Mismatches found at concrete call sites:

| File:line                                                          | Has class                       | Has ARIA          | Verdict                             |
| ------------------------------------------------------------------ | ------------------------------- | ----------------- | ----------------------------------- |
| `react-ui-list` `ListItem.tsx:188`                                 | `dx-selected dx-hover`          | `aria-selected`   | **OK** — canonical pattern.         |
| `react-ui-search` `Listbox.tsx:133`                                | `dx-focus-ring`                 | `aria-selected`   | OK.                                 |
| `react-ui-search` `SearchStack.tsx:103`                            | `dx-current dx-hover dx-selected` | none           | **Broken** — three classes, no ARIA. |
| `react-ui-mosaic` `DefaultStackTile.tsx:31`                        | `dx-current dx-hover`           | none              | **Broken** — `dx-current` only fires on `aria-[current=true]`. |
| `react-ui-introspect` `ToolList.tsx` (initial draft)               | `dx-active`                     | `aria-pressed`    | **Doubly wrong** — class undefined; `aria-pressed` is toggle-button semantics, not row-selection. |

Findings:

- `dx-active` should be deleted from any code that mentions it (it doesn't
  exist) **or** introduced as a real utility — the latter is unnecessary
  since `dx-selected` already covers selected-row styling.
- `dx-highlighted` is defined but unused in this audit. Either delete or
  document the Radix-highlighted use case it's reserved for.
- `SearchStack` and `DefaultStackTile` need either ARIA fixed or classes
  removed. Recommend ARIA fixed (the styling intent is real).

## 5. Findings

1. **Three packages are converging on the same job**: `react-ui-stack`,
   `react-ui-mosaic.Stack`, and (parts of) `react-ui-list.List` all
   layout-and-reorder a linear set of items. The codebase has already
   marked this — `react-ui-stack` `PLAN.md` says replace with Mosaic,
   `react-ui-list/List` is `@deprecated` for the same reason. The
   migration is incomplete: 6+ legacy `react-ui-stack` consumers remain.

2. **No elemental "row primitive"**. Every layer above
   `react-primitives/react-list` either skips it (and re-implements
   ARIA inconsistently — see `ToolList`, `FileTree`, `MeetingsList`) or
   bundles in heavy machinery (Mosaic's DnD + virtualizer) for things
   that don't need it. The natural home for a 50-line "list of
   selectable rows with correct ARIA + dx-* grammar" is missing.

3. **`react-ui-list` is poorly named for its actual contents**. It's
   really a "tree + accordion + (deprecated) list" package. Tree is
   unique and active; Accordion is unique and active. The deprecated
   `List` is dead weight that confuses the package's purpose.

4. **`react-ui-search` overlaps with the missing primitive**.
   `Listbox` / `SearchList` are well-built selectable-row components
   with proper ARIA + keyboard nav; they happen to live next to a
   search input by historical accident. The selection logic is general
   enough to extract.

5. **`react-primitives/react-list` is unused** — but it's the right
   layer for an elemental ARIA-only primitive. The reason nobody uses
   it is that it has no styling and no keyboard nav, so a consumer
   has to add both, at which point they roll their own.

6. **`dx-*` selection grammar is inconsistent**. There's a coherent
   pattern (`aria-selected` ↔ `dx-selected`, `aria-current` ↔
   `dx-current`, `dx-hover` is free) but three of the five call sites
   I checked don't follow it. Documenting the rule in
   `packages/ui/ui-theme` and adding a lint check would prevent
   recurrence.

## 6. Recommendation

A layered model with clear responsibilities. Each layer has one job and
defers everything else upward:

```
                    ┌──────────────────────────────────────────┐
   Heavy /          │  react-ui-mosaic                         │
   feature-rich     │    Stack, VirtualStack, Tile, Board      │
                    │    DnD, virtualization, current-tracking │
                    └──────────────────┬───────────────────────┘
                                       │ depends on
                    ┌──────────────────┴───────────────────────┐
                    │  react-ui-list (renamed in spirit)       │
                    │    Row, Card, RowList, CardList          │
                    │    Tree, Accordion                       │
                    │    aria-selected/aria-current grammar    │
                    │    dx-* utility pairing                  │
                    │    keyboard nav (tabster) for plain rows │
                    └──────────────────┬───────────────────────┘
                                       │ depends on
                    ┌──────────────────┴───────────────────────┐
                    │  react-primitives/react-list             │
                    │    role=listbox / role=option            │
                    │    aria-selected / aria-multiselectable  │
                    │    purely structural                     │
                    └──────────────────────────────────────────┘
```

Specifically:

- **`react-primitives/react-list`** stays as the structural ARIA
  primitive. It's used by `react-ui-list` only. **Flat, scroll-agnostic,
  not compound** — by design. Compound APIs and ScrollArea integration
  belong in `react-ui-list`, never in the primitive.
- **`react-ui-list`** is rebuilt as the elemental, opinionated layer.
  Compound, Radix-style API:
  - `RowList.Root` / `CardList.Root` — **headless** context provider
    (no DOM); owns selection state. Layout is the caller's
    responsibility, matching Radix `Select.Root` / `Dialog.Root`.
  - `RowList.Viewport` / `CardList.Viewport` — `role="listbox"`,
    arrow-nav (tabster), `aria-label`, and `dx-container` for filling
    its parent. Wraps `ScrollArea.Root` + `ScrollArea.Viewport` by
    default; opt out via `scroll={false}` for popover-style usage.
  - `Row` / `Card` — `role="option"` items with the right `dx-*` ↔
    `aria-selected` pairing by construction.
  - Keep `Tree` and `Accordion` (still unique).
  - Delete the `@deprecated` `List` (Phase 6 — see consumer survey
    below).
- **`react-ui-search`** is refactored to compose `react-ui-list`'s
  `RowList` instead of holding its own. The search-specific bits
  (debounced input, auto-select-first, scroll-into-view) become a
  thin layer on top: `<SearchList>` = `<SearchInput>` + `<RowList>`
  + filtering hook.
- **`react-ui-mosaic`** stays focused on virtualization, DnD, and
  card/board layouts. It can adopt `react-ui-list`'s `Card` primitive
  for tile content where helpful, but keeps its independent container
  story.
- **`react-ui-stack`** is fully retired. All call sites move to
  `Mosaic.Stack` (the existing TODO).
- **Keyboard navigation: `@fluentui/react-tabster` is the canonical
  arrow-traversal layer; `react-ui-list` adds a thin explicit
  `onKeyDown` on the listbox as belt-and-braces.** Every list-shaped
  surface in the layered model uses tabster's `useArrowNavigationGroup`
  (axis: vertical, `memorizeCurrent: true`) so plain Tab + arrow
  navigation works without per-component wiring. New code should not
  roll its own focus management or arrow-key handlers — if you're
  reaching for that, you've probably skipped a layer.

  `react-ui-list` `RowList.Viewport` additionally implements WAI-ARIA
  listbox keyboard semantics directly (ArrowUp / ArrowDown / Home /
  End, no wraparound) for two reasons: it works in environments where
  tabster isn't initialized (some Storybook contexts), and tabster
  alone doesn't cover behaviors specific to the listbox role —
  selection-follows-focus and focus-on-entry (when the `<ul>` itself
  receives focus, redirect to the selected option). Both are gated to
  the listbox layer; downstream users of `RowList` get all of this for
  free.

  Existing tabster consumers: `react-ui-search` `Listbox`,
  `react-ui-stack` `Stack`, `react-ui-mosaic` `Focus.Group`,
  `react-ui-list` `RowList.Viewport`.

- **The dx-* grammar** is documented in the README / a small
  `selection.css.md` next to `selected.css`. The rule:
  - `aria-selected` ↔ `dx-selected`.
  - `aria-current` ↔ `dx-current`.
  - `aria-pressed`, `aria-checked`, `aria-expanded` are not
    selection-row attributes — don't pair with `dx-selected`.
  - `dx-hover` is free and can be combined with any of the above.

This is the "make `react-ui-list` more useful" branch of the original
question, not the "consolidate on Mosaic" branch. Two reasons it wins
on the evidence:

- **Bundle weight**: 9+ ad-hoc lists exist precisely because Mosaic
  pulls in a virtualizer and DnD that the consumer doesn't want.
  Forcing every selectable row through `react-ui-mosaic` would either
  bloat plugins or push them back to ad-hoc.
- **Correctness**: the components that get ARIA right today
  (`ListItem`, `Listbox`, `SearchList`) are simple selectable lists,
  not Mosaic. Promoting that pattern is cheaper than re-deriving it
  for Mosaic.

Mosaic still wins for card stacks, virtualized timelines, and
drag-and-drop trees. It's the *upper* layer, not the *only* layer.

## 7. Migration plan

Phases are sized to land in independent PRs. Each phase is shippable on
its own; later phases assume earlier ones.

### Phase 1 — Document and lock the grammar (no code changes)

- Land this AUDIT.md.
- Add a short `dx-selection-grammar.md` next to
  `packages/ui/ui-theme/src/css/components/selected.css` documenting
  the ARIA ↔ `dx-*` pairing rules.
- Open issues for the three known mismatches (`SearchStack`,
  `DefaultStackTile`, any remaining `dx-active` references).

Estimated: 1 PR, trivial.

### Phase 2 — Fix mismatches in place

- `SearchStack`: pick a side — either set `aria-current` /
  `aria-selected` on the tile, or drop the `dx-*` classes. Pair
  whichever is left.
- `DefaultStackTile`: same fix.
- Any remaining `dx-active` strings: delete.
- Add an ESLint rule (or a `unocss`/`tailwind` preset check) flagging
  `dx-selected` without `aria-selected` and `dx-current` without
  `aria-current`. (Best-effort — drop if not feasible.)

Estimated: 1 PR, small.

### Phase 3 — Promote `react-primitives/react-list` to the elemental ARIA layer

- Confirm the API (it's already close): `List` with `role="listbox"`,
  `ListItem` with `role="option"` + `aria-selected`, scope helpers.
- Add a story / README example so it's discoverable.
- No new consumers yet — that's Phase 4.

Estimated: 1 PR, small (mostly docs + minor API tightening).

### Phase 4 — Rebuild `react-ui-list` around it

- Delete the `@deprecated` `List` (3 plugin call sites — migrate them
  in this PR).
- Add `Row`, `Card`, `RowList`, `CardList` built on
  `react-primitives/react-list`. `RowList` handles keyboard nav
  (tabster arrow group) and the `dx-*` pairing automatically.
- Keep `Tree` and `Accordion` unchanged for now.
- New name discussion *optional* — `@dxos/react-ui-list` still fits
  the new contents. (If we ever rename, propose `@dxos/react-ui-rows`
  or merge `Tree`/`Accordion` into `react-ui-disclosure` — out of
  scope here.)

Estimated: 1–2 PRs, medium.

### Phase 5 — Consolidate `react-ui-search`

- Refactor `Listbox` and `SearchList` to compose `RowList` from
  Phase 4 instead of holding their own option-rendering logic.
- Extract the search-specific hooks (debounce, auto-select-first,
  scroll-into-view) into a small `useSearchListController` so they
  can be reused by anyone wiring a `RowList` to a search input.
- `Combobox` follows for free.
- `SearchStack` keeps using Mosaic — the bug from Phase 2 should
  already be fixed by then.

Estimated: 1 PR, medium.

### Phase 6 — Migrate ad-hoc plugin lists

In rough order of value:

1. `react-ui-introspect` `ToolList` → `RowList`. (Sketch in §8.)
2. `plugin-code` `FileTree` → re-use `react-ui-list` `Tree`. The
   custom impl exists because Tree felt heavyweight; with a
   re-pointed `react-ui-list` it shouldn't.
3. `plugin-sidekick` `ActionItems` → `RowList` with checkbox
   `Card`/`Row` variant.
4. `plugin-meeting` `MeetingsList` — drop the inner `<div role='list'>`
   wrapper, use the new `RowList` directly.
5. The remaining four (ChatReferences, DeploymentDialog, ChatMcpErrors,
   WelcomeTour) on a "while I'm there" basis.

Estimated: 1 PR per plugin, small each. Can be parallelized.

### Phase 7 — Retire `react-ui-stack`

- All `react-ui-stack` consumers move to `Mosaic.Stack`. Already a
  TODO in the package's `PLAN.md`.
- Delete `react-ui-stack` once the consumer count hits zero.

Estimated: 1 PR per consumer (~6), then a final delete PR.

## 8. Appendix — `ToolList` migration sketch

After Phase 4, `packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx`
collapses to roughly:

```tsx
import { RowList, Row } from '@dxos/react-ui-list';

export const ToolList = ({ tools, selected, onSelect, className }: ToolListProps) => {
  const entries = useMemo(() => Object.entries(tools).sort(([a], [b]) => a.localeCompare(b)), [tools]);
  return (
    <RowList.Root selectedId={selected} onSelectChange={(id) => onSelect?.(id, tools[id])}>
      <RowList.Viewport classNames={className} aria-label='MCP tools'>
        {entries.map(([name, tool]) => (
          <Row id={name} key={name}>
            <div className='font-mono text-xs text-subdueText'>{name}</div>
            <div className='font-medium'>{tool.title}</div>
            {tool.description && (
              <div className='text-sm text-description line-clamp-2 mt-1'>
                {tool.description.trim()}
              </div>
            )}
          </Row>
        ))}
      </RowList.Viewport>
    </RowList.Root>
  );
};
```

`RowList.Root` + `RowList.Viewport` provide:

- `role="listbox"` / `role="option"` via `react-primitives/react-list`.
- `aria-selected` set automatically on the `Row` whose id matches
  `selectedId`.
- `dx-selected dx-hover` paired correctly.
- Keyboard nav (arrow keys, Enter / Space to commit) via
  `@fluentui/react-tabster`.
- `ScrollArea.Root` + `Viewport` wrapper baked into `Viewport` by
  default (set `scroll={false}` to opt out for popover-style usage).

Net diff for `ToolList`: ~30 lines deleted, no styling regressions, no
ARIA mismatches possible by construction.

## 9. Open questions

- Do `Tree` and `Accordion` belong in the same package as `RowList` /
  `CardList`? Probably yes for now (one import path, common dx-*
  grammar) but worth re-asking once the package settles.
- Should `react-ui-mosaic`'s `Tile` adopt `react-ui-list`'s `Card`?
  Yes if the visual shape is compatible — to be settled when Phase 4
  lands.
- Is there value in a `Group` primitive (header + collapsible body
  containing a `RowList`)? `react-ui-search`'s `SearchList.Group`
  hints yes; defer to Phase 5.
- ESLint vs Stylelint vs documentation-only for the `dx-*` ↔ ARIA
  pairing rule? Pick the cheapest enforceable option in Phase 2.

## 10. References

Files cited in this audit (paths relative to repo root):

- `packages/ui/react-ui-list/src/components/List/`
- `packages/ui/react-ui-list/src/components/Tree/`
- `packages/ui/react-ui-list/src/components/Accordion/`
- `packages/ui/react-ui-mosaic/src/components/Mosaic/`
- `packages/ui/react-ui-mosaic/src/components/Board/`
- `packages/ui/react-ui-mosaic/src/components/Focus/`
- `packages/ui/react-ui-stack/src/components/Stack/`
- `packages/ui/react-ui-stack/PLAN.md`
- `packages/ui/react-ui-search/src/components/Listbox/`
- `packages/ui/react-ui-search/src/components/SearchList/`
- `packages/ui/react-ui-search/src/components/SearchStack/`
- `packages/ui/react-ui-search/src/components/Combobox/`
- `packages/ui/react-primitives/react-list/src/`
- `packages/ui/ui-theme/src/css/components/selected.css`
- `packages/ui/ui-theme/src/css/components/focus.css`
- `packages/ui/ui-theme/src/css/utilities.css`
- `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx`
- `packages/plugins/plugin-meeting/src/containers/MeetingsList/`
- `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx`
- `packages/plugins/plugin-feed/src/components/PostStack/PostStack.tsx`
- `packages/plugins/plugin-inbox/src/components/MessageStack/MessageStack.tsx`
- `packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx`
