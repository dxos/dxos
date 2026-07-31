# `@dxos/react-ui-mosaic` — Design & Primer

Living document. A developer's first stop for virtualized, drag-and-drop, and
card/board layouts. For the wider list-stack rationale see
[`react-ui-list/AUDIT.md`](../react-ui-list/AUDIT.md).

## What this package is

The heavy, feature-rich layout layer. It composes the lighter list layers and
adds the things they deliberately omit: **virtualization** (thousands of items),
**drag-and-drop reordering**, **resizing**, and **multi-column boards**.

```
@dxos/react-ui-mosaic    ← you are here: virtualization · DnD · resize · boards
        ▲ composes
@dxos/react-ui-list      themed components + reusable aspects
        ▲ composes
@dxos/react-list         ARIA + structure only
```

**Reach for this package** when a plain `@dxos/react-ui-list` component would be
too light: a long virtualized feed, a draggable card stack, a kanban board, or a
resizable tiled surface. For a simple static or selectable list, stay in
`@dxos/react-ui-list`.

## Three building blocks

1. **Mosaic** — the generic DnD + layout engine (Root / Container / Tile +
   Stack / VirtualStack).
2. **Board** — a kanban pattern built on Mosaic, driven by a reactive model.
3. **SearchStack** — a ready-made virtualized result stack.

Plus **Focus** (re-exported from `@dxos/react-ui`) for focus-group/current-item
semantics, and a set of hooks.

## How drag-and-drop is wired

Mosaic uses `@atlaskit/pragmatic-drag-and-drop` directly (it does **not** use
`@dxos/react-ui-list`'s `useReorder*` aspects). The model is explicit, not
auto-wired:

- `Mosaic.Root` runs a single `monitorForElements()` — the global drag boundary.
- Each `Mosaic.Container` registers a drop handler and owns its orientation,
  `currentId`, and selection.
- Each `Mosaic.Tile` is both a `draggable()` and a `dropTargetForElements()` with
  closest-edge detection.
- Gaps use fractional locations (0.5, 1.5, …); both `Placeholder` and `Tile` are
  drop targets, enabling precise insertion and cross-container transfer (via an
  `onTake` callback on the source).

Keyboard navigation is via `Focus.Group` (from `@dxos/react-ui`), **not** Tabster
or `useListNavigation`. Selection/current-item tracking lives on the Container,
not on `useListSelection`. (Why these diverge from react-ui-list's aspects — and
whether they should converge — is the analysis in
[`react-ui-list/AUDIT.md`](../react-ui-list/AUDIT.md).)

## Cross-container drag-and-drop

A single app-level `Mosaic.Root` is the only live drag boundary, so every
`Mosaic.Container` in the app registers into **one shared handler registry** keyed
by `eventHandler.id`. This is what lets a tile be dragged from one container into a
_different_ one. The registry mechanics are in place; the cross-container drop
**policy** is not yet built.

**Invariants the shared registry relies on:**

- **One live Root.** Each layout shell (`DeckLayout`, `SimpleLayout`, the testing
  layout) mounts a `Mosaic.Root`, and exactly one layout is mounted at runtime. No
  other component mounts its own Root — a nested Root would fork the registry and
  isolate its subtree from cross-container drags.
- **Per-instance container ids.** An id must be unique per _live container
  instance_, not per object: the same ECHO object can mount in two containers at
  once (the in-call chat companion beside the primary, or "open in new plank").
  Object-derived ids therefore append a stable `useId()` discriminator —
  `` `${objectUri}:${useId()}` ``.
- **`payload` seam.** `MosaicEventHandler.payload?: unknown` is an open,
  container-defined descriptor of what a container holds. Mosaic never interprets
  it; it exists so a target's drop logic can decide acceptance from typed data
  rather than by parsing the opaque `id`. Unpopulated until the rules below land.

**The drop rules (not yet built):**

1. **Thread the source payload to the target.** On drop, `Root` already resolves
   the source handler (`handlers[source.containerId]`); pass its `payload` into the
   target's `canDrop`/`onDrop` as an additive argument. Targets then decide
   acceptance from typed data, keeping identity (`id`) and semantics (`payload`)
   separate.
2. **Populate `payload` per container.** Object-bound containers set e.g.
   `{ typename, uri }`; structural containers (deck, nav) a role tag. This is
   non-uniform by construction — generic UI containers (`Thread`, `Board`) hold no
   single object and must receive their `payload` from the plugin caller.
3. **Accept-matrix is app policy, not a Mosaic concern.** Which tile types a
   container accepts is decided per-plugin, in that container's `canDrop`. This
   package carries only the mechanism (registry, payload plumbing), never the
   policy.

**Deferred — Board-based containers.** `Board.Content` (kanban, pipeline) has
_nested_ handlers: the columns container plus a per-column item container keyed by
`column.columnValue`. Making those unique per instance requires threading a
`useId()` discriminator through the tile-render path
(`Mosaic.Stack` → column `Tile` → `useKanbanItemEventHandler`), which `Mosaic.Stack`
does not forward today. This is a known gap in the per-instance-id invariant above.

## Component hierarchies

Compound nesting a consumer must follow. `*` marks an optional element.

### Mosaic — generic DnD layout engine

```
Mosaic.Root                        global DnD boundary (monitorForElements)
└─ Mosaic.Container                drop target + focus scope; owns orientation,
   │                               currentId, selection
   └─ Mosaic.Stack | VirtualStack  linear layout (VirtualStack = + tanstack/react-virtual)
      ├─ Mosaic.Tile               draggable + drop target (closest-edge)
      │  ├─ Mosaic.DragHandle *    auto-registers with the Tile
      │  ├─ Mosaic.ResizeHandle *  edge resize affordance
      │  └─ (tile content)
      ├─ Mosaic.Placeholder *      explicit drop slot (implicit inside Stack)
      └─ Mosaic.DropIndicator *    visual insertion hint
```

### Board — kanban over Mosaic

```
Board.Root                         provides the reactive BoardModel (atoms)
└─ Board.Content                   horizontal scroll of columns
   └─ Board.Column                 a column (compound; itself a Mosaic.Tile)
      ├─ Board.Column.Header       toolbar: drag handle + actions menu
      ├─ Board.Column.Body         vertical Mosaic.Container of items
      │  └─ Board.Item             default card tile (drag handle inside)
      └─ Board.Column.Footer       add-item affordance
   └─ Board.Placeholder *          column/insertion placeholder
   └─ Board.Debug *                JSON state inspector
```

`DefaultBoardColumn` assembles `Column.Root/Header/Body/Footer` for the common
case. `BoardModel<TColumn, TItem>` is an interface of `@effect-atom` atoms +
callbacks the caller supplies (columns, items per column, move/insert/remove).

### SearchStack — virtualized result stack

```
SearchStack                        single component (not compound)
  props: items, currentId, onAction, …  → renders results as cards in a
                                          VirtualStack with current-item tracking
```

### Focus — re-exported from `@dxos/react-ui`

```
Focus.Group                        focus zone (current/selection semantics)
└─ Focus.Item                      member; useFocus() reads group state
```

## Hooks

| Hook                           | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `useMosaic`                    | Root DnD state + container registry.                        |
| `useMosaicContainer`           | Current container state: orientation, currentId, selection. |
| `useMosaicTile`                | Per-tile drag/resize state.                                 |
| `useVisibleItems`              | Hide the dragged item from a Stack during a drag.           |
| `useEventHandlerAdapter`       | Wrap a mutable array with drop handlers (Ref-aware).        |
| `useDefaultColumnEventHandler` | Pre-wired drop handling for Board columns.                  |
| `useContainerDebug`            | Optional debug overlay.                                     |
| `useBoard` / `useBoardColumn`  | Read the Board model / column context.                      |

## Conventions

- **Resize utilities** (`ResizeHandle`, `Size`, `sizeStyle`, `resizeAttributes`)
  come from `@dxos/react-ui-dnd`. (Per the AUDIT D3, the non-atlaskit `Size`/`Side`/
  `sizeStyle` stay in `react-ui-dnd`; the two spurious consumers were cleaned instead.)
- **Subpath exports**: `./testing` (`CardContainer`, `DefaultStackTile`,
  decorator) and `./playwright` (`board-manager`) for E2E.
- **`dx-*` ↔ ARIA grammar**: same rules as the rest of the stack —
  `aria-current` ↔ `dx-current`, `aria-selected` ↔ `dx-selected`; see
  `ui-theme/src/css/components/state.md`. (Two tiles historically carried `dx-*`
  classes without backing ARIA — tracked in the AUDIT.)
