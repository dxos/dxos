# react-ui-list aspects — design

Date: 2026-06-13
Branch: claude/eager-turing-3896f7 (from claude/condescending-kepler-66cc20)
Status: approved (in-session brainstorm); implementation in progress

## Motivation

`@dxos/react-ui-list` currently ships three list-shaped compounds that evolved on
parallel tracks:

- **`List`** (deprecated): pragmatic-dnd primitives, no keyboard nav, `role='listitem'`.
- **`OrderedList`**: wraps the deprecated `List`. Adds single-expand state via Radix
  context + chrome (`DragHandle`, `Title`, `ExpandCaret`, `DeleteButton`, `DetailItem`).
  `role='list'`. No keyboard nav.
- **`RowList`**: uses `@dxos/react-list` primitives + Tabster `useArrowNavigationGroup` +
  single-select. `role='listbox'` / `option`. No DnD, no virtualization.

`Tree` (also in the package) brings yet another DnD wiring and exposes a
`gridTemplateColumns` + `renderColumns` escape hatch that no other compound has —
a sign the slot set is straining.

`Mosaic.Stack` and `Mosaic.VirtualStack` (in `@dxos/react-ui-mosaic`) duplicate the
pragmatic-dnd plumbing once more, and use `Focus.Group` (a Tabster wrapper) for
keyboard nav instead of the same hook RowList uses.

The result is three implementations of drag-and-drop, two Tabster wrappers, three
ARIA role conventions, and `gridTemplateColumns` only on `Tree`. This design
introduces a missing layer — **aspect hooks** — that the compounds compose, so
behaviour has one home and compounds are thin (and easy to add).

This is the natural next step after `AUDIT.md` Phases 1–5: keep the three-layer
package model, plug a behaviour layer between the ARIA primitive and the
opinionated compounds.

## Existing three-layer model (kept)

```
┌──────────────────────────────────────────────┐
│ react-ui-mosaic                              │
│   Stack, VirtualStack, Tile, Board           │
└────────────────────┬─────────────────────────┘
                     │ depends on
┌────────────────────┴─────────────────────────┐
│ react-ui-list                                │
│   RowList, OrderedList, Tree, Accordion, …   │
│   + NEW: src/aspects (this design)           │
└────────────────────┬─────────────────────────┘
                     │ depends on
┌────────────────────┴─────────────────────────┐
│ react-primitives/react-list                  │
│   <ol>/<ul> with optional role='listbox';    │
│   <li> with optional role='option' /         │
│   aria-selected; Radix Collapsible.          │
│   ARIA + structure only.                     │
└──────────────────────────────────────────────┘
```

The new aspects layer sits in `react-ui-list/src/aspects/`. It is consumed by
`react-ui-list`'s compounds and **also** exported so `react-ui-mosaic` can adopt
it (Mosaic already depends on `react-ui-list`, so this is a no-op for the
dependency graph).

The ARIA primitive package (`react-list`) is untouched.

## Aspect catalogue

Each aspect is a single hook that owns one cross-cutting concern. Aspects do
**not** render. They return refs, prop-bags, and state for compounds to apply.

### 1. `useListNavigation` — keyboard + ARIA role

Wires Tabster according to a declared mode. Bundles role + keyboard semantics
because they're inseparable (a `listbox` needs arrow-nav + selection-follows-focus +
`aria-selected`; a `grid` needs two-axis nav + `aria-rowindex`).

```ts
type ListNavigationMode = 'list' | 'listbox' | 'grid';

type UseListNavigationOptions = {
  mode: ListNavigationMode;
  axis?: 'vertical' | 'horizontal' | 'both'; // 'both' implies grid
  memorizeCurrent?: boolean; // default: true
  /** Selector for the focus-on-entry target inside the container. */
  focusOnEntrySelector?: string;
};

type UseListNavigationReturn = {
  /** Spread onto the container element. role/aria attrs + Tabster data-attrs + onFocus. */
  containerProps: {
    'role': 'list' | 'listbox' | 'grid';
    'aria-orientation'?: 'vertical' | 'horizontal';
    'data-tabster': string;
    'onFocus': (e: FocusEvent<HTMLElement>) => void;
  };
  /** Apply to each item. role + tabIndex. */
  itemProps: (opts?: { disabled?: boolean }) => {
    'role': 'listitem' | 'option' | 'row';
    'tabIndex': number;
    'aria-disabled'?: true;
  };
};

export const useListNavigation: (opts: UseListNavigationOptions) => UseListNavigationReturn;
```

**Mode semantics:**

| Mode      | Container role | Item role  | Tabster                                                                                                          | Focus-on-entry                                                      |
| --------- | -------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `list`    | `list`         | `listitem` | `useArrowNavigationGroup({ axis: 'vertical' })` (so focus moves between draggable handles / interactive buttons) | first focusable                                                     |
| `listbox` | `listbox`      | `option`   | `useArrowNavigationGroup({ axis: 'vertical', memorizeCurrent: true })` + selection-follows-focus integration     | `[aria-selected="true"]`, then first non-disabled `[role="option"]` |
| `grid`    | `grid`         | `row`      | `useArrowNavigationGroup({ axis: 'both' })`                                                                      | first focusable cell                                                |

**Escape hatch:** mode is fixed per compound; if a caller needs custom Tabster
(e.g. Mosaic's Focus.Group nested in a multi-pane layout), they call
`useArrowNavigationGroup` directly. The aspect is opinionated about the
"sequence of items" pattern.

### 2. `useReorder` — pragmatic-dnd reorder

Thin orchestration over `@atlaskit/pragmatic-drag-and-drop`. Speaks
pragmatic-dnd's vocabulary; never hides the underlying primitives. Returns
refs + state per item; the compound (or caller) renders the drop indicator.

```ts
type UseReorderOptions<T> = {
  items: readonly T[];
  getId: (item: T) => string;
  onMove: (fromIndex: number, toIndex: number) => void;
  axis?: 'vertical' | 'horizontal'; // default: 'vertical'
  readonly?: boolean;

  // --- direct pragmatic-dnd passthroughs (all optional) ---
  /** Merged into pragmatic-dnd's `getInitialData` for the draggable. */
  getInitialData?: (item: T, index: number) => Record<string, unknown>;
  /** Forwarded to pragmatic-dnd's `dropTargetForElements`. */
  canDrop?: (args: { source: ElementDragPayload }) => boolean;
  /** Forwarded to `setCustomNativeDragPreview`. Optional custom drag preview. */
  getDragPreview?: (item: T) => ReactNode;
};

type ReorderItemState =
  | { type: 'idle' }
  | { type: 'preview'; container: HTMLElement }
  | { type: 'dragging' }
  | { type: 'dragging-over'; closestEdge: 'top' | 'bottom' | null };

type ReorderItemBinding = {
  rowRef: RefCallback<HTMLElement>;
  handleRef: RefCallback<HTMLElement>;
  state: ReorderItemState;
  isDragging: boolean;
  closestEdge: 'top' | 'bottom' | null;
};

type UseReorderReturn = {
  /** Pass the item id to get the bindings to apply to that row. */
  bind: (id: string) => ReorderItemBinding;
  /** Whatever item is currently being dragged in this list. */
  active: { id: string; item: any } | null;
};

export const useReorder: <T>(opts: UseReorderOptions<T>) => UseReorderReturn;
```

Auto-scroll is intentionally a sibling hook, not baked in:

```ts
export const useReorderAutoScroll: (containerRef: RefObject<HTMLElement>) => void;
```

**Why it doesn't obfuscate pragmatic-dnd:**

- Returns refs + state; renderable indicator is the compound's job.
- `getInitialData` / `canDrop` / `getDragPreview` are direct passthroughs — payload
  shapes match pragmatic-dnd. Debugging crosses one layer, not two.
- Cross-list drag composes by instantiating `useReorder` in two compounds; pragmatic-dnd's
  `monitorForElements` is global and each list's `canDrop` filters its sources.
- A caller that has to fight the hook drops to `draggable()` + `dropTargetForElements()`
  directly. The hook is thin enough to delete.

### 3. `useListDisclosure` — open/close per item

Wraps a controllable single- or multi-expand state machine. Generates the ids
needed for `aria-controls` / `aria-labelledby`.

```ts
type UseListDisclosureOptions = {
  /** 'single' — at most one open at a time. 'multi' — set of ids. */
  mode: 'single' | 'multi';
  /** Controlled value. */
  value?: string | ReadonlySet<string>;
  defaultValue?: string | ReadonlySet<string>;
  onValueChange?: (next: string | undefined | ReadonlySet<string>) => void;
};

type DisclosureItemBinding = {
  expanded: boolean;
  toggle: () => void;
  /** id on the disclosure trigger button. */
  triggerId: string;
  /** id on the controlled panel. */
  panelId: string;
  /** Spread onto the trigger (caret/title) button. */
  triggerProps: {
    'id': string;
    'aria-expanded': boolean;
    'aria-controls': string;
    'onClick': () => void;
  };
  /** Spread onto the disclosed panel `<div>`. */
  panelProps: {
    'id': string;
    'role': 'region';
    'aria-labelledby': string;
  };
};

type UseListDisclosureReturn = {
  /** Per-item binding. `id` is the item id. */
  bind: (id: string) => DisclosureItemBinding;
};

export const useListDisclosure: (opts: UseListDisclosureOptions) => UseListDisclosureReturn;
```

Notes:

- Single mode matches `OrderedList`'s current behaviour. Multi mode covers
  `Tree` (multiple branches open) and future `Accordion`-replacement use cases.
- `panelId` / `triggerId` are stable per item id; remount-safe.

### 4. `useListSelection` — single/multi select

Owns selection model. Single-select matches `RowList`'s current behaviour;
multi-select is forward-shaped but the API includes both from day one.

```ts
type UseListSelectionOptions = {
  mode: 'single' | 'multi';
  /** Controlled. For 'single', a string id; for 'multi', a Set. */
  value?: string | ReadonlySet<string>;
  defaultValue?: string | ReadonlySet<string>;
  onValueChange?: (next: string | undefined | ReadonlySet<string>) => void;
  /** Selection-follows-focus. Defaults to true for 'single', false for 'multi'. */
  followsFocus?: boolean;
};

type SelectionItemBinding = {
  selected: boolean;
  toggle: () => void;
  /** Spread onto the row to bind click + focus + ARIA. */
  rowProps: {
    'aria-selected': boolean;
    'onClick': (e: MouseEvent) => void;
    'onFocus'?: (e: FocusEvent) => void;
  };
};

export const useListSelection: (opts: UseListSelectionOptions) => {
  bind: (id: string, opts?: { disabled?: boolean }) => SelectionItemBinding;
};
```

Multi-select is implemented but not exposed via a new compound in this PR; it
is the next iteration's lever (per AUDIT.md §9 open questions).

### 5. `useListGrid` — row grid template

Generalises `Tree`'s `gridTemplateColumns` + `renderColumns` props. A row is a
CSS grid with named tracks:

- `handle` — drag handle slot (fixed width: `var(--dx-rail-item)`).
- `title` — flexible (`1fr`).
- `actions` — inline actions, zero-or-more rail-items.
- `expand` — expand caret slot (fixed width: `var(--dx-rail-item)`).
- `trailing` — outside the row's "card" outline; a fixed-width slot whose
  vertical position is anchored to the title row (does **not** shift when the
  row's body expands).

```ts
type UseListGridOptions = {
  /** Number of `var(--dx-rail-item)` slots between title and expand. */
  actionSlots?: number; // default: 0
  /** Whether the row reserves an expand-caret slot. */
  expandable?: boolean;
  /** Whether the row reserves a trailing-action slot outside the card. */
  trailing?: boolean;
};

type UseListGridReturn = {
  /** Spread onto the outer row element. */
  rowProps: { className: string; style: CSSProperties };
};

export const useListGrid: (opts: UseListGridOptions) => UseListGridReturn;
```

Underneath: `grid-template-columns: var(--dx-rail-item) 1fr [actionN…] [expand?] [trailing?]`
with `items-start` and the body in a CSS subgrid so the title row co-aligns with
the trailing slot. See §"Row alignment" below for the rationale.

### 6. `useListVirtualizer` — opt-in virtualization

Thin adapter around `@tanstack/react-virtual` matching the existing
`Mosaic.VirtualStack` house style. Out of MVP scope (no current `react-ui-list`
compound uses it), but the contract is fixed so a `VirtualRowList` is a 30-line
follow-up.

```ts
type UseListVirtualizerOptions = {
  count: number;
  getScrollElement: () => HTMLElement | null;
  estimateSize: (index: number) => number;
  getItemKey: (index: number) => string;
  gap?: number;
  overscan?: number;
  /** When non-null, opens the row's slots for placeholder rendering during DnD. */
  reorder?: UseReorderReturn | null;
};

export const useListVirtualizer: (opts: UseListVirtualizerOptions) => Virtualizer<HTMLElement, HTMLElement>;
```

The reorder integration is the gnarly bit; the contract follows
`Mosaic.VirtualStack`'s interleaved-placeholder pattern. Implementation is
deferred — see §"Virtualization + reorder" below.

### 7. `useListFilter` — derived items

Pure derivation, not strictly an "aspect" in the keyboard/DnD sense — but
worth co-locating so callers find one place for "list-shaped concerns".

```ts
export const useListFilter: <T>(items: readonly T[], predicate: (item: T) => boolean) => readonly T[];
```

Used by `Combobox` / `SearchList` today; surfaced here for parity.

## Compound spec

Each compound is a thin file that picks an aspect set, threads them into
provider context, and renders its default markup. Compounds preserve their
current public namespace API at the call-site (no breaking changes for
external consumers).

| Compound            | Mode    | Reorder | Disclosure | Selection | Grid                                                             | Virtual |
| ------------------- | ------- | :-----: | :--------: | :-------: | ---------------------------------------------------------------- | :-----: |
| `RowList`           | listbox |    —    |     —      |  single   | implicit (1 column row)                                          |    —    |
| `OrderedList`       | list    |    ✓    |   single   |     —     | handle/title/actions/expand/trailing                             |    —    |
| `Tree`              | list    |    ✓    |   multi    |     —     | configurable (today's `gridTemplateColumns` becomes useListGrid) |    —    |
| `List` (deprecated) | list    |    ✓    |     —      |     —     | implicit                                                         |    —    |

Deferred (out of scope this PR, contracts fit):

- `Accordion` — disclosure-only; the existing Radix wrapper is fine.
- `Combobox.List` / `Listbox` / `Picker` — listbox mode + filter; future PR.
- `Mosaic.Stack` — adopts `useListNavigation` only this PR; `useReorder`
  adoption is the follow-up PR.

## Markup pattern (with row-alignment fix)

`OrderedList.DetailItem` today uses:

```tsx
<div className='grid grid-cols-[min-content_1fr_min-content] items-start gap-1 pb-1'>
  <DragHandle />
  <div className='flex flex-col border border-subdued-separator rounded-sm'>
    {' '}
    {/* 1px borders */}
    <div className='flex items-center'>
      <Title /> {actions} {expandable && <ExpandCaret />}
    </div>
    {expanded && <div role='region'>{children}</div>}
  </div>
  <DeleteButton classNames='my-[1px]' /> {/* nudge to align with bordered title */}
</div>
```

Problems:

- `my-[1px]` is a pixel hack: `IconBlock` is `var(--dx-rail-item)` tall, but the
  bordered column's content area is 2px shorter (1px top + 1px bottom border),
  so the title text centerline sits 1px below the trailing icon's centerline.
- The trailing icon button can perceptibly shift between collapsed and expanded
  states because of `items-start` + the border math.
- `grid-cols-[min-content_…]` uses content-defined widths rather than the
  rail-item token, so handle and trailing don't have stable widths.

**New pattern** (introduced by `useListGrid` + the compound's default markup):

```tsx
<div
  className='grid items-start gap-1 pb-1'
  style={{
    gridTemplateColumns: `var(--dx-rail-item) 1fr repeat(${actionSlots},var(--dx-rail-item)) ${expandable ? 'var(--dx-rail-item)' : ''} ${trailing ? 'var(--dx-rail-item)' : ''}`,
  }}
>
  <DragHandle />
  <div className='ring-1 ring-subdued-separator rounded-sm flex flex-col col-span-[…]'>
    <div className='flex items-center min-h-[var(--dx-rail-item)]'>
      <Title /> {actions} {expandable && <ExpandCaret />}
    </div>
    {expanded && <div role='region'>{children}</div>}
  </div>
  <DeleteButton /> {/* no my-[1px] */}
</div>
```

Key changes:

- **`ring-1` instead of `border`** for the central card outline. Rings are
  rendered via `box-shadow`; they do not occupy layout. The content area of
  the card is the full `var(--dx-rail-item)` height, matching `IconBlock`'s slot.
- **Explicit `var(--dx-rail-item)` track widths** for handle / expand /
  trailing. Stable across compounds; the same column width every time.
- **`min-h-[var(--dx-rail-item)]`** on the title row inside the card so the
  title text always centers at the same vertical line as the trailing icon
  button, with no nudge.
- **`items-start`** preserved on the outer grid so the trailing icon stays
  anchored at the row's top regardless of body expansion.
- `my-[1px]` is removed everywhere it appears in `react-ui-list`.

Net effect: handle, title centerline, and trailing icon centerline all sit on
the same line, in both collapsed and expanded states. No per-pixel nudges.

## Theme tokens

Compounds move their classnames into `tx('list.*')`. The token surface:

```
list.root            // <div role='list'|'listbox'|'grid'> container
list.row             // outer grid row
list.row.disabled    // disabled-row override
list.handle          // drag handle button slot
list.title           // title text/button
list.card            // ring-1 outlined central column (used by detail rows)
list.cardRow         // the inner title row inside `list.card`
list.panel           // disclosed detail region (role='region')
list.trailing        // trailing action slot
list.dropIndicator   // pragmatic-dnd closest-edge indicator
```

Density is **not** introduced this PR. The token set is designed so a future
density variant (`{ density: 'compact' | 'cozy' | 'comfortable' }`) layers in
without API churn — adding a variant parameter to existing tokens. See AUDIT.md
§9 open questions.

## Migration order (this PR)

Bounded scope to land the aspect contracts + the two compounds that exercise them
most directly. Tree and Mosaic adoption are deferred to follow-up PRs once the
contract has settled.

1. **`src/aspects/`** — implement and unit-test the aspect hooks. Each in its
   own file with a co-located `*.test.ts`. ✓ landed.
2. **`OrderedList`** — refactor onto `useReorder` + `useListDisclosure` + `useListGrid`
   - `useListNavigation({ mode: 'list' })`. **Stop wrapping the deprecated `List`.**
     Public namespace API preserved (`Root` / `Content` / `Item` / `DetailItem` / `DragHandle` /
     `Title` / `ExpandCaret` / `DeleteButton`). Replace the bordered card with `ring-1`
     so handle / title / caret / trailing all share a baseline (kills `my-[1px]`). ✓ landed.
3. **`RowList`** — refactor onto `useListNavigation({ mode: 'listbox' })` +
   `useListSelection({ mode: 'single' })`. Internal DOM stays
   identical (still uses `@dxos/react-list` primitives). Public API preserved. ✓ landed.
4. **Deprecated `List`** — stays in this PR (no consumers depend on it once
   OrderedList detaches). Final deletion is AUDIT.md Phase 6 follow-up.
5. **External call-sites** — no breaking-change surface in this PR. The
   OrderedList / RowList namespace APIs are preserved, so plugin-pipeline /
   ArrayField / ViewEditor / etc. are no-op.
6. **Tests + storybooks** — full storybook pass, particular attention to the
   three critical stories: ArrayField/Ordered, ViewEditor/Default,
   PipelineProperties/Default (dark).

### Deferred to follow-up PRs

- **`Tree`** — would refactor onto `useReorder` + `useListDisclosure({ mode: 'multi' })`
  - `useListGrid`. Risk: Tree has its own DnD wiring (hierarchical drop targets:
    above / below / into) and a `gridTemplateColumns` + `renderColumns` API used by
    navtree (6 files) and devtools. Land separately so the contract for
    hierarchical reorder gets focused review.
- **Mosaic.Stack keyboard nav** — Mosaic.Stack itself is a pure layout primitive
  with no ARIA or keyboard wiring; Focus.Group is applied by _consumers_
  (`SearchStack`, `Board.Column`, the Stack story). "Adopting useListNavigation"
  means migrating those consumers, not Stack itself. Defer to the PR that does
  Mosaic's full reorder adoption — they share the same call-site sweep.
- **`useReorder` adoption in Mosaic.Stack / Mosaic.VirtualStack** — VirtualStack's
  interleaved-placeholder logic and cross-Stack drag are gnarly. The aspect
  contract is fixed (see §"Mosaic.Stack call-site sketch"); implementation lands
  separately.
- **`Combobox.List` / `Listbox` / `Picker`** — listbox + filter; the contracts
  above cover them. Migrate alongside any future search-domain refactor.
- **Density variants** — token surface designed to absorb them; deferred until
  there's a concrete density spec across compounds.

## Mosaic.Stack call-site sketch (for follow-up PR)

Today: `Mosaic.Stack` uses `Focus.Group` for keyboard nav and re-implements
pragmatic-dnd in `Container.tsx` + `Stack.tsx`. Target shape after this PR
plus its follow-up:

```tsx
// In Mosaic/Stack.tsx, after adopting useListNavigation + useReorder.
const MosaicStack = ({ id, items, onMove, ... }) => {
  const nav = useListNavigation({ mode: 'list', axis: 'vertical' });
  const reorder = useReorder({
    items, getId: (t) => t.id, onMove,
    canDrop: ({ source }) => source.data?.mosaicId === id,   // scope to this Stack
    getInitialData: (t) => ({ mosaicId: id, tile: t }),       // cross-stack drag identity
  });
  useReorderAutoScroll(scrollRef);
  return (
    <div ref={scrollRef} {...nav.containerProps}>
      {items.map((tile, i) => {
        const binding = reorder.bind(tile.id);
        return (
          <MosaicTile
            key={tile.id}
            ref={binding.rowRef}
            {...nav.itemProps()}
            data-state={binding.state.type}
          >
            <DragHandle ref={binding.handleRef} />
            {tile.body}
            {binding.closestEdge && <DropIndicator edge={binding.closestEdge} />}
          </MosaicTile>
        );
      })}
    </div>
  );
};
```

Notes:

- Cross-stack drag is handled by `canDrop` + `getInitialData` payloads; the
  hook's `monitorForElements` is per-instance, and two stacks coexist on
  pragmatic-dnd's global monitor.
- `Mosaic.VirtualStack` adopts the same shape with `useListVirtualizer({ reorder })`
  to drive the interleaved-placeholder slots — that integration is the meat
  of the follow-up PR and is gated on `useListVirtualizer`'s implementation.

## Virtualization + reorder (deferred, for completeness)

`Mosaic.VirtualStack` currently interleaves "placeholder" slots into the
virtualizer's `count` so drop targets exist between virtual items:

```ts
const virtualizer = useVirtualizer({
  count: draggable ? visibleItems.length * 2 + 1 : visibleItems.length,
  estimateSize: (i) => (i % 2 === 0 ? 0 : estimateSize(Math.floor(i / 2))),
  getItemKey: (i) => i % 2 === 0 ? `ph-${i}` : getId(visibleItems[Math.floor(i / 2)]),
  ...
});
```

`useListVirtualizer`'s contract above accepts an optional `reorder` argument
to drive this transformation internally. The hook's response: when `reorder !== null`,
double the count, interleave placeholder keys, and yield a `range` array
the caller iterates with `kind: 'placeholder' | 'item'`. The caller renders
each kind. The transformation is internal so callers don't reinvent it.
**This is deferred** — no current `react-ui-list` compound needs it; the
contract exists so the follow-up Mosaic refactor is mechanical.

## Open questions / known follow-ups

- **Density**: deferred. Token surface designed to absorb density variants.
- **`Tree`'s `legacy` prop**: should be removed after navtree's migration.
  Add a deprecation note pointing at the slot-based replacement.
- **`Combobox.List` / `Listbox` / `Picker`**: deferred. They are listbox + filter;
  the contracts above cover them.
- **`Mosaic.VirtualStack`**: the interleaved-placeholder migration is the
  highest-risk piece deferred from this PR. Land `useListVirtualizer` first
  in a focused PR.
- **`Mosaic.Stack` `useReorder` adoption**: deferred. The nav-only adoption
  this PR validates `useListNavigation` cross-package; reorder adoption needs
  cross-stack drag verification (drag from one Stack into another).
- **`react-ui-stack` retirement**: AUDIT.md Phase 7. Independent of this PR.
- **Multi-select compound**: `useListSelection({ mode: 'multi' })` lands as
  contract; no compound exposes it this PR. AUDIT.md §9 calls this out.

## Validation plan

After implementation:

1. `moon run react-ui-list:test` — aspect unit tests + compound unit tests
   (e.g., RowList selection follows focus, OrderedList expand toggles
   `aria-expanded`).
2. `moon run react-ui-list:build` + `moon run react-ui-mosaic:build` — type-check.
3. `moon run :lint -- --fix` — lint clean.
4. Storybook pass on `react-ui-list` and `react-ui-form` stories.
5. The three critical stories must render parity-identical to baseline:
   - ArrayField/Ordered
   - ViewEditor/Default
   - PipelineProperties/Default (dark theme)
6. NavTree (consumer of `Tree`) renders and behaves identically.

## References

- `AUDIT.md` in `packages/ui/react-ui-list/` — the three-layer model and
  Phase 6 plan this design extends.
- `agents/superpowers/specs/2026-06-12-ordered-list-component-design.md` — the
  preceding `OrderedList` design.
- `https://atlassian.design/components/pragmatic-drag-and-drop/` — pragmatic-dnd docs.
- `https://www.w3.org/WAI/ARIA/apg/patterns/listbox/` — WAI-ARIA listbox pattern.
