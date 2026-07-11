# Universal Drag-and-Drop Core — Design

Status: **draft** · Date: 2026-07-10 · Scope: `@dxos/react-ui-dnd`, `@dxos/react-ui-mosaic`, `@dxos/react-ui-list`, `@dxos/react-ui-board`

## Summary

Extract the drag-and-drop orchestration that currently lives inside
`@dxos/react-ui-mosaic` into `@dxos/react-ui-dnd` as a **universal core** that
every container shape (Stack, List/Tree, Kanban, Grid, Board) registers into, so
items can be dragged **between different container types** through one shared
monitor and one transfer protocol.

The forcing function is a new **Grid/Board** container (draggable tiles on a
regular grid, push-to-displace, snap-to-grid resize). Building it exposes the
1-D assumptions baked into Mosaic today; generalizing them is what turns Mosaic's
already-generic orchestration into a reusable core.

### Non-goals

- Rewriting the monitor/registry/transfer logic — it is already generic; this is
  a **promotion + generalization**, not a rewrite.
- Migrating Tree in this project (fast-follow; see Phasing).
- Re-pointing Kanban's bespoke pivot-field logic (it already consumes Board and
  keeps working).
- Infinite-canvas features of the existing `react-ui-board` `Board` (zoom, pan,
  center-origin) — retained as a viewport concern, not folded into the engine.

## Background (what the audit found)

Three packages were audited (`react-ui-mosaic`, `react-ui-list`,
`plugin-kanban`).

1. **Mosaic already is a working universal core.** `Mosaic.Root` runs a single
   `monitorForElements`; containers self-register in a `Record<containerId,
handler>` registry; drops route to same-container `onDrop` or cross-container
   `onTake`→`onDrop`. Kanban proves cross-container drag works today (cards move
   between per-column containers). Nothing about this orchestration is
   Stack-specific.
2. **The 1-D assumptions are concentrated, not pervasive.** They live in:
   `LocationType = string | number` (a scalar linear index with `±0.5` edges and
   `Math.floor` insert); the closest-edge hitbox; the single-axis `orientation`;
   Stack's interleaved half-integer placeholders; and the array-`splice` default
   adapter. There is **no collision/push/compaction** anywhere.
3. **`react-ui-list` diverged.** It wires `@atlaskit/pragmatic-drag-and-drop`
   directly, **twice** (`aspects/useReorder.ts` for flat lists, `Tree/TreeItem`
   for trees), with three drop-indicator implementations and three
   monitor-ownership patterns across the two packages, and **no transfer
   protocol**. Its own `AUDIT.md`/`DESIGN.md` already track this convergence debt.
   Critically, its **recent hooks-driven API** (a reference-stable controller
   from `useReorderList` + a per-row `useReorderItem` that binds row/handle via
   callback refs and keeps state local) is the ergonomics reference for the core.
   Its one wrong-for-us choice is a **per-list monitor** — islands cannot drag
   between each other.

**Conclusion:** adopt **Mosaic's monitor topology** (one central monitor +
registry + transfer handshake) with **List's hooks ergonomics** (controller +
per-tile callback-ref binding + local state), and make **location + hitbox
pluggable per container**.

Related prior art to reconcile with (not block on): the existing
`react-ui-board` `Board` (infinite canvas) and
`docs/superpowers/specs/2026-07-04-masonry-layout-engine-design.md` (a layout
engine spec worth reusing concepts from for the Grid packing engine).

## Architecture

`@dxos/react-ui-dnd` grows from "drag-to-resize handle + size utils" into the
DnD foundation, in four layers. Dependency direction is strictly downward; the
core depends on nothing in `react-ui-mosaic`/`-list`/`-board` (no cycles).

```
@dxos/react-ui-dnd  (core)
  Layer 1  monitor + container registry + transfer routing   (Dnd.Root)
  Layer 2  pluggable Location + Hitbox + drop resolver
  Layer 3  hooks (useDndContainer / useDndTile / useDndResize) + thin components
  Layer 4  LayoutModel interface  (+ ResizeHandle/sizeStyle, already here)
        ▲            ▲              ▲              ▲
   react-ui-mosaic  react-ui-list  react-ui-board  plugin-kanban
   Stack · Board    OrderedList    Grid · Board    (via Board)
                    (Tree: f/f)     (new)
```

### Layer 1 — Monitor + registry (`Dnd.Root`)

Promotion of `Mosaic.Root`. Mounts the single `monitorForElements`
(`canMonitor` recognises the core payload), holds the container registry, tracks
active-drag state, and routes drop:

- source handler and target handler resolved from `containerId` (source payload)
  and the walked `dropTargets` (target).
- `sourceHandler === targetHandler` → `onDrop({ source, target })` (reorder).
- otherwise → `onTake({ source }, cb)` on the source (clone/mutate/remove), whose
  callback invokes `onDrop` on the target (cross-container transfer).

`DndContainerHandler` (renamed `MosaicEventHandler`):
`{ id, payload?, canDrop?, onDrag?, onDrop?, onTake?, onCancel? }`.

Drag payload (renamed `MosaicTileData`):
`{ type: 'tile', containerId, id, data, location, bounds? }`, with a
`getSourceData` guard.

**`containerId` uniqueness** — the audit flagged a real hazard (two Kanban boards
under one Root can collide on bare column-value ids). The core **requires** a
mandatory per-instance discriminator (helper: `useContainerId(prefix)` →
`${prefix}:${useId()}`); handlers built without it are a lint/dev-time error.

### Layer 2 — Location + hitbox (the generalization)

`Location` is **opaque + comparable** (decision below). Each container supplies:

- a **hitbox strategy** — `'closest-edge'` (stack/list), `'tree-instruction'`
  (tree), `'grid-cell'` (grid). Edge/instruction come from pragmatic-dnd;
  `grid-cell` is our geometry (pointer → `{ x, y }`).
- a **drop resolver** — `resolve(source, target) → placement`. The core never
  interprets `location`; it hands source+target to the resolver.

This removes the `±0.5` / `Math.floor` / closest-edge logic baked into `Tile` and
the default adapter today.

### Layer 3 — Hooks + thin components (List's ergonomics)

- `useDndContainer({ id, hitbox, canDrop, onDrop, onTake, autoScroll }) →
controller` — reference-stable (mutable inputs held in refs, per `useReorder`);
  self-registers into `Dnd.Root`; owns the container drop-target + optional
  `autoScrollForElements`.
- `useDndTile(controller, id) → { rootRef, handleRef, state, ... }` — binds
  row+handle via callback refs, owns **local** state (no sibling re-render),
  merging `useReorderItem` with `Mosaic.Tile`'s draggable/preview half: portal
  drag preview (`setCustomNativeDragPreview` + `preserveOffsetOnSource`), the
  native `effectAllowed = 'move'` fix, and the state machine
  `idle | preview | dragging | target`.
- `useDndResize(...)` — generalizes today's 1-D `ResizeHandle` to a 2-D,
  grid-snapped variant for Grid (edge + corner handles producing integer
  span deltas); 1-D containers keep the existing single-axis behaviour.
- Thin Radix wrappers `Dnd.Tile` / `Dnd.DragHandle` / **one**
  `Dnd.DropIndicator` (collapses the three indicator implementations across
  mosaic + list into a single theme-aware component).

### Layer 4 — Layout data structure (`LayoutModel`)

Interface a container implements so the core and tiles stay layout-agnostic:

```ts
interface LayoutModel<TLocation> {
  get(id: string): TLocation | undefined; // item → location
  move(id: string, to: TLocation): void; // apply a resolved placement
  resize?(id: string, size: Size2D): void; // grid only
  serialize(): unknown; // persistable form
}
```

- 1-D containers back it with an ordered id array (index locations).
- **Grid** backs it with the **collision/pack engine** — the net-new substance:
  - `mode: 'pack' | 'float'` (`pack` = compact + push, `float` = free placement).
  - operations: `moveItem`, `resizeItem`, `resolveCollisions`, `compact`.
  - **origin-agnostic**: 0-indexed internally; the coordinate transform to a
    center-origin/negative-index space happens at the viewport. This is what lets
    **Board = Grid engine in `float` mode + canvas viewport**.
  - pure/headless → unit-testable without React.

## Consumers after the core lands

| Container          | Hitbox           | Location    | Notes                                                                       |
| ------------------ | ---------------- | ----------- | --------------------------------------------------------------------------- |
| Stack (mosaic)     | closest-edge     | index       | migrate off local Root/context                                              |
| OrderedList (list) | closest-edge     | index       | migrate; adopt central monitor + shared indicator; keep per-row local-state |
| Tree (list)        | tree-instruction | path        | **fast-follow**, not this project                                           |
| **Grid** (board)   | grid-cell        | `{x,y,w,h}` | **new**: collision/push engine + 2-D resize                                 |
| **Board** (board)  | grid-cell        | `{x,y,w,h}` | Grid `float` + canvas viewport (re-implement existing Board)                |
| Kanban (plugin)    | closest-edge     | index       | unchanged — already on Board                                                |

## Resolved decisions

1. **Core home** → expand `@dxos/react-ui-dnd` (vs keeping it in mosaic or a new
   package). Neutral home; mosaic/list/board/kanban all depend on it.
2. **Scope** → core + Grid + Board + migrate flat `OrderedList`. Tree and any
   Kanban internal rework are fast-follows.
3. **`Mosaic.Root` fate** → **promoted to `Dnd.Root` and deleted as a symbol; no
   compat shim.** The ~3 app shells that mount it (`plugin-deck` `DeckLayout`,
   `plugin-simple-layout`, `plugin-testing`) switch to `Dnd.Root` in the same
   change (house rule: no re-exports when moving code). `Mosaic.Container`/`Tile`/
   `Stack`/`Board` keep working, reading registry/active-drag context from the
   core instead of a mosaic-local context. There is **no dual-Root period**.
4. **Location type** → opaque + container-supplied comparator (vs a
   core-known discriminated union). Most flexible; containers own their location
   semantics.
5. **Tree** → out of scope now (hierarchical instruction/reparent model differs
   enough to de-risk by deferring).

## Phasing

Phase 1 is load-bearing: everything depends on `Dnd.Root` existing.

1. **Core extraction + Root promotion (own PR).** Move monitor/registry/
   handler/payload/transfer into `@dxos/react-ui-dnd` as `Dnd.Root`. Rename
   types. Add mandatory `containerId` discriminator. Cut over the 3 app shells;
   keep Stack/Board/Kanban green with the closest-edge hitbox as the only
   strategy. **No behaviour change.** (The `useDndContainer`/`useDndTile` hooks
   are deferred to Phase 2 — see the phase1 plan's phasing note.)
2. **Pluggable hitbox + `LayoutModel` + one `DropIndicator`.** Introduce the
   hitbox strategy seam and the resolver; collapse the 3 drop indicators.
3. **Grid container + collision/pack engine.** Headless engine first (unit tests
   for move/resize/push/compact), then the `grid-cell` hitbox + 2-D
   `useDndResize` + the `+`-button backdrop.
4. **Board re-implementation.** Board = Grid engine (`float`) + canvas viewport;
   retire `Board.Cell` in favour of the shared tile.
5. **OrderedList migration.** Move `useReorder` onto the core (central monitor,
   shared indicator), preserving per-row local-state; keep Tree on its current
   path.

Each phase lands independently with the suite green.

## Testing

- **Engine** (`grid/engine.ts`) — pure unit tests: move into occupied cell
  displaces neighbours; resize respects min/max and pushes; `compact` in `pack`;
  no reflow in `float`; origin transform round-trips.
- **Core hooks** — controller reference-stability across renders; tile binding/
  teardown on ref detach (no leaked pragmatic-dnd registrations); cross-container
  `onTake`→`onDrop` handshake fires with correct source/target.
- **Storybook** per container (house rule: every new UI component gets a
  `.stories.tsx`) — Grid drag/push/resize; cross-container drag between a Stack
  and a Grid in one `Dnd.Root` (the headline capability).
- **Regression** — Kanban card move between columns still works after Phase 1
  (no behaviour change).

## Risks

- **Phase 1 blast radius touches app layout shells.** Mitigated by keeping it a
  behaviour-preserving rename with the suite + Kanban regression green before
  merge.
- **Collision/push UX is the genuine unknown.** Mitigated by building the engine
  headless and test-first before wiring any React.
- **Opaque location loses core-level type safety.** Accepted; containers own
  their location types and comparators, which is the point.
