# `@dxos/react-ui-list` — Design & Primer

Living document. A developer's first stop for the high-level list components.
For the package's place in the wider stack and the consolidation roadmap, see
[`AUDIT.md`](./AUDIT.md).

## What this package is

The opinionated, themed list layer. It sits between the ARIA-only primitive
(`@dxos/react-list`) and the virtualization/card layer (`@dxos/react-ui-mosaic`):

```
@dxos/react-ui-mosaic   virtualization · cards · boards · heavy DnD
        ▲ composes
@dxos/react-ui-list     ← you are here: themed components + reusable aspects
        ▲ composes
@dxos/react-list        ARIA + structure only (role=listbox/option, aria-selected)
```

**Reach for this package** when you need a styled, keyboard-accessible list,
picker, tree, or accordion. Reach **down** to `@dxos/react-list` only to build a
brand-new selectable surface with full control over styling. Reach **up** to
`@dxos/react-ui-mosaic` when you need virtualization (thousands of rows),
drag-to-reorder cards, or a kanban board.

## Two layers inside the package

1. **Aspects** (`src/aspects/`) — headless hooks that own one behaviour each.
   Components compose them; you can too, when assembling a bespoke list.
2. **Components** (`src/components/`) — ready-made compounds built from the
   aspects + `@dxos/react-list` primitives + the shared theme
   (`components/List.theme.ts`).

### Aspects

| Hook                  | Owns                                       | Returns                                   |
| --------------------- | ------------------------------------------ | ----------------------------------------- |
| `useListNavigation`   | roving-tabindex keyboard nav + ARIA role   | `containerProps`, `itemProps()`           |
| `useListSelection`    | single/multi selection (`aria-selected`)   | `bind(id) → { selected, rowProps, … }`    |
| `useListDisclosure`   | single/multi expand (`aria-expanded`)      | `bind(id) → { expanded, triggerProps, … }`|
| `useListGrid`         | row grid template (handle/title/actions)   | `rowProps { className, style }`           |
| `useReorderList`      | drag-reorder controller (pragmatic-dnd)    | `{ controller, active }`                  |
| `useReorderItem`      | per-row drag wiring                         | `{ rowRef, handleRef, state, closestEdge }`|
| `useReorderAutoScroll`| auto-scroll the viewport while dragging     | callback `ref`                            |

All selection/disclosure hooks support **controlled and uncontrolled** use and
key controlled-ness off the *presence* of the `value` prop (so clearing to
`undefined` / empty set works — Radix's `useControllableState` does not).

### Components

| Component     | Shape                              | Aspects used                                              |
| ------------- | ---------------------------------- | --------------------------------------------------------- |
| `Listbox`     | styled list; **selection opt-in**  | `useListNavigation`, `useListSelection('single')` when wired |
| `OrderedList` | reorderable master-detail rows     | `useReorder*`, `useListDisclosure('single')`, `useListNavigation('list')`, `useListGrid` |
| `Tree`        | reactive hierarchical tree          | atom-based `TreeModel` (own model — see note) + pragmatic-dnd; renders via `Treegrid` |
| `Treegrid`    | `role=treegrid` grid layout (rows/cells) | own `tv` theme + arrow-key row nav (`@fluentui/react-tabster`) |
| `Accordion`   | collapsible sections                | Radix Accordion (own disclosure — see note)               |
| `Combobox`    | popover list + text input           | composes `Picker`                                          |
| `Picker`      | input-driven option list (virtual focus) | own registry + keyboard (activedescendant pattern)    |
| `ItemContent` | presentational row layout (icon/title/desc) | none (layout only)                               |
| `Empty`       | empty-state placeholder             | none                                                       |

> **`Listbox` selection is opt-in.** Pass `value`/`defaultValue`/`onValueChange` on
> `Listbox.Root` for a single-select `role=listbox` (options carry `aria-selected`
> + `dx-selected`, selection follows focus); omit them for plain `role=list` rows
> (hover only, no selection) — the styled-content-list shape that replaces the
> deprecated `@dxos/react-ui` `List`/`ListItem`. (To be renamed `List` once that
> legacy component is deleted.)

> **Note on divergence.** `Tree` uses an `@effect-atom` model (per-node reactive,
> for large trees) rather than the useState-based selection/disclosure aspects;
> `Accordion` uses Radix (for its slide animation); `Picker` keeps browser focus
> on the input and highlights via `aria-activedescendant` rather than roving
> tabindex. These are deliberate — see the aspect-convergence analysis in
> [`AUDIT.md`](./AUDIT.md).

## Component hierarchies

Compound nesting a consumer must follow. `*` marks an optional wrapper.

### Listbox — styled list (selection opt-in)

```
Listbox.Root                       headless; selectable iff value model is wired
└─ Listbox.Viewport *              ScrollArea (omit inside a popover)
   └─ Listbox.Content              <ul> · role=listbox (selectable) or role=list (plain)
      └─ Listbox.Item              <li> · role=option + aria-selected (selectable),
         │                              or role=listitem hover-only (plain)
         ├─ Listbox.ItemContent    icon + title + description (or…)
         ├─ Listbox.ItemLabel      plain truncating label
         └─ Listbox.Indicator *    trailing check on the selected row
```

### OrderedList — reorderable, single-expand master-detail

```
OrderedList.Root                   owns reorder + disclosure + nav
└─ OrderedList.Viewport *          ScrollArea + drag auto-scroll
   └─ OrderedList.Content          container; applies nav containerProps
      └─ OrderedList.Item          one reorderable row (grid via useListGrid)
         │   — or the higher-level —
         └─ OrderedList.DetailItem master-detail row, composes:
            ├─ OrderedList.DragHandle
            ├─ OrderedList.Title          (toggles the detail panel)
            ├─ OrderedList.IconButton *   inline action(s)
            ├─ OrderedList.ExpandCaret
            ├─ OrderedList.DeleteButton *
            └─ (detail panel children, shown when expanded)
```

### Tree — reactive hierarchical tree

```
Tree                               props: model: TreeModel, rootId, draggable, renderColumns…
└─ Treegrid.Root                   grid container (this package); one row per node
   └─ TreeItem (per node)          Treegrid.Row + indent
      ├─ TreeItemToggle            expand/collapse caret (branches)
      ├─ TreeItemHeading           icon + label + count badge
      └─ renderColumns(item) *     caller-supplied trailing cells
```

`TreeModel` is an interface of `@effect-atom` atom families the caller supplies:
`item(id)`, `childIds(parentId?)`, `itemOpen(path)`, `itemCurrent(path)`,
`itemProps(path)`. The tree subscribes per-node, so only changed rows re-render.

### Treegrid — `role=treegrid` grid layout

```
Treegrid.Root                      <div role=treegrid> · grid · arrow-key row nav
└─ Treegrid.Row                    <div role=row> · aria-level / aria-expanded / aria-owns
   └─ Treegrid.Cell                <div role=gridcell> · `indent` carries per-level padding
```

The low-level grid primitive `Tree` builds on; also used directly by navtree
(`NavTreeItemColumns`) and devtools (`ObjectsTree`). Self-contained `tv` theme
(`Treegrid.theme.ts`) — no central theme registration. Row depth derives from the
id's `~`-separated path; `Treegrid.theme.rowLevel(level)` supplies the indent class.

### Accordion — collapsible sections

```
Accordion.Root                     items + getId; multi-expand
└─ Accordion.Item                  one section (Radix Item)
   ├─ Accordion.ItemHeader         trigger row (icon + caret + content)
   └─ Accordion.ItemBody           slide-animated content
```

### Combobox — popover list + input  (composes Picker)

```
Combobox.Root                      open + value state; wraps Popover.Root
├─ Combobox.Trigger | VirtualTrigger
└─ Combobox.Portal *
   └─ Combobox.Content             Popover.Content + Picker.Root
      ├─ Combobox.Input            text input (→ Picker.Input)
      ├─ Combobox.List             ScrollArea (role=listbox)
      │  └─ Combobox.Item          → Picker.Item; commits value + closes
      ├─ Combobox.Empty *
      └─ Combobox.Arrow *
```

### Picker — input-driven option list (the generic combobox primitive)

```
Picker.Root                        item registry + virtual-highlight state
├─ Picker.Input                    owns ↑↓/Home/End/Enter/Escape; focus stays here
└─ Picker.Item (×n)                role=option; highlighted via aria-selected
```

Filtering is the caller's job — render only the matching `Picker.Item`s. For
fuzzy/search filtering, pair with `@dxos/react-ui-search`.

## Conventions

- **Theme.** Component classes live in `components/List.theme.ts` (tailwind-variants);
  per-instance overrides flow through `classNames`. `Treegrid` carries its own
  `tv` theme (`Treegrid.theme.ts`). Mirror this when adding a component — add a
  slot, don't inline literals.
- **`dx-*` ↔ ARIA grammar.** `aria-selected` ↔ `dx-selected` (chosen row);
  `aria-current` ↔ `dx-current` (you-are-here); `dx-hover` is free. Definitions
  in `ui-theme/src/css/components/state.md`.
- **Drop indicators.** Box-edge reorder (OrderedList) uses atlaskit's
  `@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box` directly (same as
  `Mosaic`); the tree-instruction indicator is a small local `TreeDropIndicator`
  port (atlaskit ships no `tree-item` renderer).
- **Refs.** Use `forwardRef` with the `forwardedRef` parameter name; import React
  symbols by name.
```
