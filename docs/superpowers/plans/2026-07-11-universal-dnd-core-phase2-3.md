# Universal DnD Core — Phases 2 (additive) + 3 (Grid) Implementation Plan

> Executed unattended overnight; landing PR #12165 stays with the user. Behavior that needs a real
> drag gesture is NOT self-verifiable and is deferred to the morning DRAG-TEST CHECKLIST
> (see `docs/superpowers/2026-07-11-overnight-log.md`).

**Goal:** Add the additive core primitives Grid needs, then build a headless grid layout engine
(collision / push / compact / resize / float) + a `Grid` container component in `@dxos/react-ui-board`.

**Scope reduction (see overnight-log decision #1):** Phase 2 here is ADDITIVE only. The spec's Mosaic
migration + drop-indicator consolidation are DEFERRED (they change unverifiable drag behavior/visuals).

---

## Phase 2 (additive) — `@dxos/react-ui-dnd`

### Task 2.1 — Opaque `DndLocation` + comparator

- `DndLocation` stays `string | number` for existing consumers (Mosaic), but add a generic parameter
  path so a container can carry a structured location (e.g. grid `{x,y,w,h}`) as `data.location`.
  Keep it backward-compatible: `type DndLocation = unknown` at the payload boundary, with containers
  owning interpretation. Do NOT change Mosaic's usage (it keeps `number`). Additive only.

### Task 2.2 — `LayoutModel` interface + tests

- `packages/ui/react-ui-dnd/src/dnd/layout.ts`: `interface LayoutModel<TLocation>` with
  `get(id) / move(id, to) / resize?(id, size) / serialize()`. Pure type; no runtime.
- Trivial array-backed reference impl + unit test (documents the contract).

### Task 2.3 — `useDndContainer` / `useDndTile` (NEW, standalone)

- Model on `react-ui-list`'s `useReorder`: `useDndContainer({ id, canDrop, onDrop, onTake, hitbox })`
  returns a reference-stable controller that self-registers into `Dnd.Root` (via `useDndRootContext`).
  `useDndTile(controller, id, { draggable, dragHandle })` binds root+handle via callback refs, owns
  local drag state, wires pragmatic `draggable` + `dropTargetForElements` with the container's hitbox.
- Hitbox seam: `type Hitbox = 'closest-edge' | 'grid-cell'`; Grid supplies `grid-cell` geometry.
- Unit-test what's headless: controller reference-stability across renders; registration/teardown on
  ref detach. Drag gestures → morning checklist.

---

## Phase 3 — `@dxos/react-ui-board` Grid

### Task 3.1 — Headless engine `src/components/Grid/engine.ts` (TDD, EXHAUSTIVE)

Types:

```ts
export type GridItem = { id: string; x: number; y: number; w: number; h: number };
export type GridConstraints = { minW?: number; minH?: number; maxW?: number; maxH?: number };
export type GridLayout = { columns: number; items: GridItem[] };
export type GridMode = 'pack' | 'float';
```

Coordinates: 0-indexed, integer, top-left origin. `x + w <= columns`. Rows unbounded (grow down).

Pure functions (each returns a NEW layout, never mutates input):

- `overlaps(a, b): boolean`
- `clampToColumns(item, columns): GridItem` — clamp x so `x+w<=columns`, `x>=0`, `w<=columns`.
- `applyConstraints(size, c): {w,h}` — clamp w/h to min/max.
- `resolveCollisions(layout, movedId): GridLayout` — push items overlapping `movedId` DOWNWARD
  (increase y minimally), cascading to items they then overlap. Deterministic order (by y then x).
- `compact(layout): GridLayout` — gravity up: each item (top-to-bottom, left-to-right) moves to the
  smallest y with no overlap against already-placed items.
- `moveItem(layout, id, to:{x,y}, mode): GridLayout` — clamp target, set pos, resolveCollisions,
  then compact iff mode==='pack'.
- `resizeItem(layout, id, size:{w,h}, constraints, mode): GridLayout` — applyConstraints, clamp,
  set size, resolveCollisions, compact iff pack.

**Test matrix (`engine.test.ts`):**

1. `overlaps` true/false incl. edge-adjacency (touching ≠ overlap).
2. move onto empty cell (float): item moves, others unchanged.
3. move onto occupied cell: occupant pushed down by exactly the overlap height.
4. cascade: A pushes B pushes C.
5. resize larger pushes the item below; resize respects minW/minH/maxW/maxH.
6. clamp: move/resize past right edge clamps x/w; negative x clamps to 0.
7. pack: compact pulls items up into gaps; float: gaps preserved, overlaps still resolved.
8. determinism: same inputs → identical output; input layout not mutated (frozen-input test).
9. no-op move (drop on own cell) → layout unchanged.

### Task 3.2 — `Grid` component (`Grid.tsx`) wired to `Dnd.Root` + hooks

- `Grid.Root` (headless: layout state + engine + onChange), `Grid.Viewport`/`Content` (renders cells
  at pixel rects from grid coords), `Grid.Cell` (tile: `useDndTile`, drag to move w/ grid-cell hitbox
  → engine.moveItem; resize handle → engine.resizeItem), `Grid.Backdrop` (empty cells with `+`
  buttons, mirrors existing Board.Backdrop). Reuse geometry math from existing `Board/geometry.ts`
  where applicable (cell↔px). Snap = integer grid coords by construction.
- Render-check only (story mounts, no console errors). Drag/resize → morning checklist.

### Task 3.3 — `Grid.stories.tsx`

- A story with a few tiles on an N-column grid, `+` buttons, drag + resize enabled. Render-verified;
  drag/resize behavior → morning checklist.

---

## Verification per task

- Every task: `moon run <pkg>:build`, `<pkg>:test`, `<pkg>:lint` green; `pnpm format`.
- Engine (3.1): the exhaustive unit suite IS the verification — this is real, complete coverage.
- Components (3.2/3.3): build + lint + story renders with no console errors; interactive behavior
  appended to the morning DRAG-TEST CHECKLIST.
- Keep PR #12165 Check green (poll `gh run list`, autofix on-branch).
