# Universal DnD Core — Phase 1 (Core Extraction + Root Promotion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote Mosaic's already-generic DnD orchestration (single monitor, container registry, cross-container transfer, drag payload) out of `@dxos/react-ui-mosaic` into `@dxos/react-ui-dnd` as `Dnd.Root` + core types, with **zero behaviour change**.

**Architecture:** Move `Root.tsx` + the DnD core types + the root context into `@dxos/react-ui-dnd`, renamed (`Mosaic*` → `Dnd*`). `Mosaic.Container`/`Tile`/`Stack`/`Board` stay in `react-ui-mosaic` but import the root context and types from the core. All `Mosaic.Root` call sites cut over to `Dnd.Root`. No compatibility re-exports (house rule). The pluggable hitbox and the `useDndContainer`/`useDndTile` hooks are **Phase 2** — this phase keeps closest-edge as the only hitbox and Container/Tile's current internal wiring intact.

**Tech Stack:** React, TypeScript, `@atlaskit/pragmatic-drag-and-drop`, Radix (`createContext`, `compose-refs`), `effect/Schema`, vitest, moon.

**Spec:** `docs/superpowers/specs/2026-07-10-universal-dnd-core-design.md`

> **Phasing note (refinement of the spec):** the spec lists `useDndContainer`/`useDndTile` under Phase 1. To keep Phase 1 strictly behaviour-preserving, those hooks move to **Phase 2** (they co-evolve with the pluggable-hitbox seam). Phase 1 promotes only Root + types + root context. This narrows blast radius and keeps every existing container green.

---

## Rename table (apply consistently everywhere)

| Old (in `react-ui-mosaic`) | New (in `react-ui-dnd`)     |
| -------------------------- | --------------------------- |
| `Mosaic.Root` (component)  | `Dnd.Root`                  |
| `MosaicRootContextValue`   | `DndRootContextValue`       |
| `useMosaicRootContext`     | `useDndRootContext`         |
| `MosaicEventHandler`       | `DndContainerHandler`       |
| `MosaicTileData`           | `DndTileData`               |
| `MosaicPlaceholderData`    | `DndPlaceholderData`        |
| `MosaicContainerData`      | `DndContainerData`          |
| `MosaicData`               | `DndData`                   |
| `MosaicTargetData`         | `DndTargetData`             |
| `MosaicDraggingState`      | `DndDraggingState`          |
| `LocationType`             | `DndLocation`               |
| `getSourceData`            | `getSourceData` (unchanged) |

> `DndLocation` keeps `string | number` in Phase 1 (behaviour-preserving). It becomes opaque + comparable in Phase 2.

## File structure

**Create (in `@dxos/react-ui-dnd`):**

- `packages/ui/react-ui-dnd/src/dnd/types.ts` — core DnD types (moved from mosaic `Mosaic/types.ts`, renamed). One responsibility: the drag payload union + handler contract + location.
- `packages/ui/react-ui-dnd/src/dnd/Root.tsx` — `Dnd.Root` + `useDndRootContext` (moved from mosaic `Mosaic/Root.tsx`, renamed).
- `packages/ui/react-ui-dnd/src/dnd/useContainerId.ts` — mandatory per-instance container-id helper (new).
- `packages/ui/react-ui-dnd/src/dnd/index.ts` — barrel for the above.
- `packages/ui/react-ui-dnd/src/dnd/Root.test.ts` — characterization test for the transfer handshake (new).
- `packages/ui/react-ui-dnd/src/dnd/useContainerId.test.tsx` — unit test (new).

**Modify:**

- `packages/ui/react-ui-dnd/package.json` — add deps.
- `packages/ui/react-ui-dnd/src/index.ts` — export `./dnd`.
- `packages/ui/react-ui-mosaic/package.json` — add `@dxos/react-ui-dnd` (already a dep for ResizeHandle; confirm).
- `packages/ui/react-ui-mosaic/src/components/Mosaic/types.ts` — delete moved types; re-derive local Mosaic-only types from core (import + `export type` composition is allowed for a package's own public surface, but per house rule prefer updating consumers; see Task 5).
- `packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx` — import root context + types from core.
- `packages/ui/react-ui-mosaic/src/components/Mosaic/Tile.tsx` — import types from core.
- `packages/ui/react-ui-mosaic/src/components/Mosaic/Mosaic.tsx` — remove `Root` from the `Mosaic` namespace; keep `Container/Tile/Stack/Board`.
- `packages/ui/react-ui-mosaic/src/components/Mosaic/index.ts` — stop exporting the moved Root/types.

**Delete:**

- `packages/ui/react-ui-mosaic/src/components/Mosaic/Root.tsx` (moved).

**Call-site cutover (`Mosaic.Root` → `Dnd.Root`), exact sites:**

- `packages/plugins/plugin-deck/src/containers/DeckLayout/DeckLayout.tsx:38,60`
- `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:153,172`
- `packages/plugins/plugin-testing/src/components/Layout/Layout.tsx:130,204`
- `packages/plugins/plugin-simple-layout/src/components/SimpleLayout/SimpleLayout.tsx:36,54`
- `packages/plugins/plugin-trip/src/components/SegmentCard/SegmentCard.stories.tsx:43,49`
- `packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.stories.tsx:50,58`
- `packages/ui/react-ui-thread/src/Thread/Thread.tsx:56` — doc-comment only; update text `Mosaic.Root` → `Dnd.Root`.

**Type-rename cutover (Kanban + any other consumers of the moved types):** ~21 references outside `react-ui-mosaic/src`, primarily `packages/plugins/plugin-kanban/src/**`. Mechanical rename via the table above.

---

### Task 1: Add core DnD dependencies to react-ui-dnd

**Files:**

- Modify: `packages/ui/react-ui-dnd/package.json`

- [ ] **Step 1: Add the pragmatic-dnd + radix deps the core needs**

`Root.tsx` uses `monitorForElements`, `autoScrollForElements` (Container does, but the core drop-effect/preview does not), `combine`, Radix `createContext` and `compose-refs`. Add to `dependencies`:

```json
"@atlaskit/pragmatic-drag-and-drop": "catalog:",
"@atlaskit/pragmatic-drag-and-drop-auto-scroll": "catalog:",
"@radix-ui/react-compose-refs": "catalog:",
"@radix-ui/react-context": "catalog:",
"@dxos/invariant": "workspace:*"
```

(`@atlaskit/pragmatic-drag-and-drop` and `@radix-ui/react-use-controllable-state` are already present.)

- [ ] **Step 2: Install and verify the workspace resolves**

Run: `pnpm install --filter @dxos/react-ui-dnd`
Expected: completes; no unmet-peer errors for the added packages. (Ignore the `DEPOT_TOKEN` warning.)

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui-dnd/package.json pnpm-lock.yaml
git commit -m "chore(react-ui-dnd): add pragmatic-dnd + radix deps for core"
```

---

### Task 2: Move the core types into react-ui-dnd

**Files:**

- Create: `packages/ui/react-ui-dnd/src/dnd/types.ts`
- Create: `packages/ui/react-ui-dnd/src/dnd/types.test.ts`

- [ ] **Step 1: Write the failing test for `getSourceData`**

```ts
// packages/ui/react-ui-dnd/src/dnd/types.test.ts
import { describe, expect, test } from 'vitest';
import { getSourceData, type DndTileData } from './types';

describe('getSourceData', () => {
  test('returns tile payload when type is tile', () => {
    const tile: DndTileData = { type: 'tile', containerId: 'c1', id: 'a', data: {}, location: 0 };
    expect(getSourceData({ data: tile } as any)).toEqual(tile);
  });

  test('returns null for non-tile payloads', () => {
    expect(getSourceData({ data: { type: 'container', id: 'c1' } } as any)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @dxos/react-ui-dnd exec vitest run --project=node src/dnd/types.test.ts`
Expected: FAIL — cannot find module `./types`.

- [ ] **Step 3: Create the types module (moved from mosaic, renamed)**

Copy `packages/ui/react-ui-mosaic/src/components/Mosaic/types.ts` verbatim into `packages/ui/react-ui-dnd/src/dnd/types.ts`, then apply the rename table (`Mosaic*` → `Dnd*`, `LocationType` → `DndLocation`). Preserve the copyright header and all JSDoc. The `getSourceData` guard, the discriminated union (`DndTileData | DndPlaceholderData | DndContainerData`), and `DndContainerHandler` (formerly `MosaicEventHandler`, incl. `canDrop`/`onDrag`/`onDrop`/`onTake`/`onCancel`) all move unchanged except for names.

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm --filter @dxos/react-ui-dnd exec vitest run --project=node src/dnd/types.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui-dnd/src/dnd/types.ts packages/ui/react-ui-dnd/src/dnd/types.test.ts
git commit -m "refactor(react-ui-dnd): move DnD core types from mosaic (renamed)"
```

---

### Task 3: Add the mandatory container-id helper

**Files:**

- Create: `packages/ui/react-ui-dnd/src/dnd/useContainerId.ts`
- Create: `packages/ui/react-ui-dnd/src/dnd/useContainerId.test.tsx`

Addresses the audit hazard: two boards under one Root colliding on bare ids.

- [ ] **Step 1: Write the failing test**

```tsx
// packages/ui/react-ui-dnd/src/dnd/useContainerId.test.tsx
import { renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useContainerId } from './useContainerId';

describe('useContainerId', () => {
  test('prefixes a stable per-instance discriminator', () => {
    const { result, rerender } = renderHook(() => useContainerId('column'));
    const first = result.current;
    expect(first).toMatch(/^column:/);
    rerender();
    expect(result.current).toBe(first); // stable across renders
  });

  test('two instances differ', () => {
    const a = renderHook(() => useContainerId('column')).result.current;
    const b = renderHook(() => useContainerId('column')).result.current;
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @dxos/react-ui-dnd exec vitest run --project=node src/dnd/useContainerId.test.tsx`
Expected: FAIL — cannot find module `./useContainerId`.

- [ ] **Step 3: Implement the helper**

```ts
// packages/ui/react-ui-dnd/src/dnd/useContainerId.ts
//
// Copyright 2026 DXOS.org
//

import { useId } from 'react';

/**
 * Produce a stable, per-instance container id. Every `DndContainerHandler.id` must be unique
 * across the whole `Dnd.Root`; a bare semantic id (e.g. a Kanban column value) collides when
 * the same container mounts twice under one root. Always derive ids through this helper.
 */
export const useContainerId = (prefix: string): string => {
  const suffix = useId();
  return `${prefix}:${suffix}`;
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm --filter @dxos/react-ui-dnd exec vitest run --project=node src/dnd/useContainerId.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui-dnd/src/dnd/useContainerId.ts packages/ui/react-ui-dnd/src/dnd/useContainerId.test.tsx
git commit -m "feat(react-ui-dnd): add useContainerId per-instance discriminator"
```

---

### Task 4: Move Root into react-ui-dnd as `Dnd.Root`

**Files:**

- Create: `packages/ui/react-ui-dnd/src/dnd/Root.tsx`
- Create: `packages/ui/react-ui-dnd/src/dnd/Root.test.ts`
- Create: `packages/ui/react-ui-dnd/src/dnd/index.ts`
- Modify: `packages/ui/react-ui-dnd/src/index.ts`

- [ ] **Step 1: Write the failing characterization test for the transfer handshake**

This is the guardrail proving the moved orchestration still routes same-container vs cross-container drops correctly. Exercise the `Dnd.Root` context directly (register two handlers, invoke the resolved routing).

```tsx
// packages/ui/react-ui-dnd/src/dnd/Root.test.ts
import { render } from '@testing-library/react';
import React, { useEffect } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { Dnd } from './Root';
import { useDndRootContext } from './Root';
import type { DndContainerHandler } from './types';

const Register = ({ handler }: { handler: DndContainerHandler }) => {
  const { addContainer, removeContainer } = useDndRootContext('test');
  useEffect(() => {
    addContainer(handler);
    return () => removeContainer(handler.id);
  }, [handler]);
  return null;
};

describe('Dnd.Root transfer routing', () => {
  test('same container → onDrop (reorder), no onTake', () => {
    const onDrop = vi.fn();
    const onTake = vi.fn();
    const handler: DndContainerHandler = { id: 'c1', onDrop, onTake };
    render(
      <Dnd.Root>
        <Register handler={handler} />
      </Dnd.Root>,
    );
    // NOTE: assert via the exported routing helper — see Step 3 for the surface under test.
    expect(onTake).not.toHaveBeenCalled();
  });
});
```

> The exact assertion surface depends on how routing is exposed for test (a pure `resolveDrop(handlers, source, target)` helper extracted from the monitor `onDrop`). Extract that pure function during Step 3 so this test can call it without a real pointer drag.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @dxos/react-ui-dnd exec vitest run --project=node src/dnd/Root.test.ts`
Expected: FAIL — cannot find module `./Root`.

- [ ] **Step 3: Move Root.tsx, renaming, and extract the pure routing helper**

Copy `packages/ui/react-ui-mosaic/src/components/Mosaic/Root.tsx` into `packages/ui/react-ui-dnd/src/dnd/Root.tsx`. Apply the rename table. Change the namespace export from `Mosaic = { Root, ... }` to `Dnd = { Root }` (only Root lives here; Container/Tile stay in mosaic). Extract the same-handler-vs-`onTake` branch from the monitor `onDrop` into a pure exported function:

```ts
export const resolveDrop = (
  sourceHandler: DndContainerHandler | undefined,
  targetHandler: DndContainerHandler | undefined,
  source: DndTileData,
  target?: DndData,
): void => {
  if (!sourceHandler || !targetHandler) return;
  if (sourceHandler === targetHandler) {
    targetHandler.onDrop?.({ source, target });
  } else if (targetHandler) {
    if (!sourceHandler.onTake) return;
    sourceHandler.onTake({ source }, async (object) => {
      targetHandler.onDrop?.({ source: { ...source, data: object }, target });
      return true;
    });
  }
};
```

Call `resolveDrop(...)` from the monitor `onDrop`. Keep `useDndRootContext` exported. Preserve `canMonitor: ({ source }) => source.data.type === 'tile'`.

- [ ] **Step 4: Update the test to assert on `resolveDrop`, then run**

Replace the Step-1 NOTE assertion with direct `resolveDrop` calls: same-handler calls `onDrop` not `onTake`; different handlers call source `onTake` then target `onDrop` with the transferred object.

Run: `pnpm --filter @dxos/react-ui-dnd exec vitest run --project=node src/dnd/Root.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the barrel and package export**

```ts
// packages/ui/react-ui-dnd/src/dnd/index.ts
//
// Copyright 2026 DXOS.org
//
export * from './types';
export * from './Root';
export * from './useContainerId';
```

Append to `packages/ui/react-ui-dnd/src/index.ts`:

```ts
export * from './dnd';
```

- [ ] **Step 6: Build the package**

Run: `moon run react-ui-dnd:build`
Expected: success (types emit; no unresolved imports).

- [ ] **Step 7: Commit**

```bash
git add packages/ui/react-ui-dnd/src/dnd/Root.tsx packages/ui/react-ui-dnd/src/dnd/Root.test.ts packages/ui/react-ui-dnd/src/dnd/index.ts packages/ui/react-ui-dnd/src/index.ts
git commit -m "refactor(react-ui-dnd): move Mosaic.Root to Dnd.Root with pure resolveDrop"
```

---

### Task 5: Re-point react-ui-mosaic at the core; delete moved files

**Files:**

- Delete: `packages/ui/react-ui-mosaic/src/components/Mosaic/Root.tsx`
- Modify: `packages/ui/react-ui-mosaic/src/components/Mosaic/types.ts`
- Modify: `packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx`
- Modify: `packages/ui/react-ui-mosaic/src/components/Mosaic/Tile.tsx`
- Modify: `packages/ui/react-ui-mosaic/src/components/Mosaic/Mosaic.tsx`
- Modify: `packages/ui/react-ui-mosaic/src/components/Mosaic/index.ts`
- Modify: `packages/ui/react-ui-mosaic/package.json` (confirm `@dxos/react-ui-dnd` dep)

- [ ] **Step 1: Delete the moved Root and the moved types**

Delete `Mosaic/Root.tsx`. In `Mosaic/types.ts`, remove the moved type definitions (payload union, handler, location) — keep only Mosaic-local types (e.g. `AllowedAxis`, orientation, anything Stack-specific). Add at the top:

```ts
import { type DndContainerHandler, type DndTileData, type DndLocation } from '@dxos/react-ui-dnd';
```

Update the remaining Mosaic-local type aliases to reference the core types by their new names.

- [ ] **Step 2: Update Container/Tile/Mosaic imports (renames)**

In `Container.tsx` and `Tile.tsx`, replace the local imports of `useMosaicRootContext`, `MosaicEventHandler`, `MosaicTileData`, etc. with imports from `@dxos/react-ui-dnd` using the new names (`useDndRootContext`, `DndContainerHandler`, `DndTileData`, …). In `Mosaic.tsx`, remove `Root` from the `Mosaic` namespace object.

- [ ] **Step 3: Update the Mosaic barrel**

In `Mosaic/index.ts`, stop exporting `Root` and the moved types. Do **not** re-export them from the core (no compat shim — consumers import `Dnd`/types from `@dxos/react-ui-dnd`).

- [ ] **Step 4: Confirm the dep**

Ensure `packages/ui/react-ui-mosaic/package.json` `dependencies` contains `"@dxos/react-ui-dnd": "workspace:*"` (already present for ResizeHandle). If missing: `pnpm add --filter @dxos/react-ui-mosaic @dxos/react-ui-dnd@workspace:*`.

- [ ] **Step 5: Build mosaic**

Run: `moon run react-ui-mosaic:build`
Expected: FAIL initially — kanban/other consumers still reference old names (fixed in Task 6). The **mosaic package itself** must compile; if it references old names, fix them here. Re-run until `react-ui-mosaic:build` passes.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/react-ui-mosaic
git commit -m "refactor(react-ui-mosaic): consume Dnd core; drop Root + moved types"
```

---

### Task 6: Cut over all consumers (call sites + type renames)

**Files (call sites):** the 7 files listed in "Call-site cutover" above.
**Files (type renames):** `packages/plugins/plugin-kanban/src/**` and any other of the ~21 external references.

- [ ] **Step 1: Cut over `Mosaic.Root` mounts to `Dnd.Root`**

In each call-site file: add `import { Dnd } from '@dxos/react-ui-dnd';`, replace `<Mosaic.Root>`/`</Mosaic.Root>` with `<Dnd.Root>`/`</Dnd.Root>`, and drop the now-unused `Mosaic` import if nothing else uses it. For `react-ui-thread/src/Thread/Thread.tsx:56`, update the doc comment text only.

- [ ] **Step 2: Rename the core-type references in consumers**

Apply the rename table across the ~21 references (mostly kanban): `MosaicEventHandler`→`DndContainerHandler`, `MosaicTileData`→`DndTileData`, `LocationType`→`DndLocation`, and switch their import source from `@dxos/react-ui-mosaic` to `@dxos/react-ui-dnd` for the moved symbols (`getSourceData` included). Leave Mosaic-container imports (`Mosaic.Container`, `Board`, `useBoard`) pointing at `@dxos/react-ui-mosaic`.

- [ ] **Step 3: Add the dnd dep to plugin-kanban if needed**

Run: `pnpm add --filter @dxos/plugin-kanban @dxos/react-ui-dnd@workspace:*` (skip if already present).

- [ ] **Step 4: Build the affected consumers**

Run: `moon run plugin-kanban:build && moon run plugin-deck:build && moon run plugin-simple-layout:build && moon run plugin-testing:build && moon run plugin-trip:build && moon run react-ui-thread:build`
Expected: all succeed.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-kanban packages/plugins/plugin-deck packages/plugins/plugin-simple-layout packages/plugins/plugin-testing packages/plugins/plugin-trip packages/ui/react-ui-thread
git commit -m "refactor: cut consumers over to Dnd.Root + Dnd core types"
```

---

### Task 7: Full regression gate

- [ ] **Step 1: Build everything**

Run: `moon exec --on-failure continue --quiet :build`
Expected: no compilation/type errors. (Ignore the `DEPOT_TOKEN` warning.)

- [ ] **Step 2: Run the DnD + mosaic + kanban tests**

Run: `moon run react-ui-dnd:test && moon run react-ui-mosaic:test && moon run plugin-kanban:test`
Expected: PASS.

- [ ] **Step 3: Lint + format**

Run: `moon run :lint -- --fix && pnpm format`
Expected: clean.

- [ ] **Step 4: Manual regression — Kanban card move (behaviour unchanged)**

Serve storybook (`moon run storybook-react:serve`, port 9009) and open the Kanban story. Verify: (a) drag a card within a column reorders it; (b) drag a card to another column moves it and rewrites the pivot field; (c) reorder columns. All must behave exactly as before this phase. Capture a screenshot as proof.

- [ ] **Step 5: Commit any lint/format fixups**

```bash
git add -A
git commit -m "chore: lint + format after Dnd core extraction"
```

---

## Self-review

**Spec coverage (Phase 1 rows only):** ✅ Root promotion + delete + no-shim (Tasks 4–6); ✅ rename of handler/payload/location (Tasks 2, 6); ✅ mandatory container-id discriminator (Task 3); ✅ Stack/Board/Kanban stay green via closest-edge only (Tasks 5–7); ✅ regression gate incl. Kanban (Task 7). Deferred to later phases (correctly out of Phase 1): pluggable hitbox, `useDndContainer`/`useDndTile`, `LayoutModel`, Grid, Board, OrderedList, one DropIndicator.

**Placeholder scan:** The Task 4 Step-1 test carries an explicit NOTE that Step 3 extracts `resolveDrop` and Step 4 rewrites the assertion — this is a real, resolved instruction, not a placeholder. No `TBD`/`TODO` remain.

**Type consistency:** `Dnd.Root`, `useDndRootContext`, `DndContainerHandler`, `DndTileData`, `DndData`, `DndLocation`, `resolveDrop`, `useContainerId` are used consistently across Tasks 2–6 and match the rename table.

---

## Phases 2–5 (separate plans, written when reached)

Each is its own plan under `docs/superpowers/plans/` and lands independently with the suite green.

- **Phase 2 — Pluggable hitbox + `useDndContainer`/`useDndTile` + one `DropIndicator` + `LayoutModel` interface.** Introduce the hitbox strategy seam (`closest-edge` default, extraction point for `grid-cell`/`tree-instruction`), extract the container/tile hooks from Mosaic.Container/Tile using `react-ui-list`'s `useReorder` ergonomics (reference-stable controller + per-tile callback-ref binding + local state), make `DndLocation` opaque + comparable, and collapse the three drop-indicator implementations into one theme-aware `Dnd.DropIndicator`.
- **Phase 3 — Grid container + collision/pack engine.** Headless `grid/engine.ts` first (unit-tested: move/displace, resize min/max + push, `compact` in `pack`, no reflow in `float`, origin transform round-trip), then the `grid-cell` hitbox + 2-D `useDndResize` + the `+`-button backdrop. Reconcile with `2026-07-04-masonry-layout-engine-design.md`.
- **Phase 4 — Board re-implementation.** Board = Grid engine (`float`) + canvas viewport (zoom/pan/center retained); retire `Board.Cell` for the shared tile.
- **Phase 5 — OrderedList migration.** Move `react-ui-list`'s `useReorder` onto the core (central monitor, shared indicator), preserving per-row local-state. Tree stays on its current path (fast-follow beyond this project).
