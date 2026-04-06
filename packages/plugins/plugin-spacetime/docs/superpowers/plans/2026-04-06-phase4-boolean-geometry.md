# Phase 4: Boolean Geometry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add boolean geometry operations (join/subtract), multi-object selection, keyboard shortcuts, and vertical-axis movement to the Spacetime 3D editor plugin.

**Architecture:** Multi-select extends the existing `Selection` type with a new `MultiObjectSelection` variant. Boolean operations are pure engine functions (Manifold `union`/`difference`) tested independently, then wired to toolbar actions that consume multi-select state. Keyboard shortcuts use a local canvas `keydown` listener scoped to editor focus. The move tool gains a modifier key check to switch between ground-plane (XZ) and vertical (Y) dragging.

**Tech Stack:** Babylon.js, Manifold (`manifold-3d` WASM), ECHO, vitest, React

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/engine/boolean-ops.ts` | Pure functions: `joinSolids`, `subtractSolids` wrapping Manifold union/difference. Handles position translation to world space and back. |
| `src/engine/boolean-ops.test.ts` | Unit tests for join and subtract operations. |

### Modified Files

| File | Changes |
|------|---------|
| `src/engine/index.ts` | Add barrel export for `boolean-ops.ts`. |
| `src/tools/tool-context.ts` | Add `MultiObjectSelection` type variant. Extend `Selection` union. |
| `src/tools/impl/select-tool.ts` | Handle shift-click in object mode to toggle objects in/out of multi-selection. |
| `src/tools/impl/move-tool.ts` | (1) Support moving all objects in a multi-selection. (2) Add metaKey/altKey check to switch to vertical (Y-axis) drag plane. |
| `src/components/SpacetimeCanvas/SpacetimeCanvas.tsx` | (1) Update `setSelection` to handle `MultiObjectSelection` highlights. (2) Add `keydown` listener for tool shortcuts. (3) Wire `onSelectionChange` to report multi-select IDs. |
| `src/components/SpacetimeToolbar/actions.ts` | Add join and subtract action buttons. Extend `EditorActions` type. |
| `src/components/SpacetimeToolbar/SpacetimeToolbar.tsx` | Pass new actions through. |
| `src/components/SpacetimeEditor/SpacetimeEditor.tsx` | (1) Track `selectedObjectIds: string[]` (ordered). (2) Implement `handleJoinSelected` and `handleSubtractSelected` callbacks. (3) Pass to toolbar and canvas. |

---

## Task 1: Boolean Operations Engine (Unit Tests + Implementation)

**Files:**
- Create: `src/engine/boolean-ops.ts`
- Create: `src/engine/boolean-ops.test.ts`
- Modify: `src/engine/index.ts`

- [ ] **Step 1: Write failing test for `joinSolids`**

Create `src/engine/boolean-ops.test.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import type { ManifoldToplevel, Manifold } from 'manifold-3d';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { joinSolids, subtractSolids } from './boolean-ops';

describe('boolean-ops', () => {
  let wasm: ManifoldToplevel;

  beforeAll(async () => {
    const Module = await import('manifold-3d');
    wasm = await Module.default();
    wasm.setup();
  });

  afterAll(() => {});

  /** Creates a 2x2x2 cube centered at origin. */
  const makeCube = (offset: [number, number, number] = [0, 0, 0]): Manifold => {
    const cube = wasm.Manifold.cube([2, 2, 2], true);
    if (offset[0] === 0 && offset[1] === 0 && offset[2] === 0) {
      return cube;
    }
    const translated = cube.translate(offset);
    cube.delete();
    return translated;
  };

  describe('joinSolids', () => {
    test('joins two overlapping cubes into a single solid', ({ expect }) => {
      // Cube A at origin, Cube B offset by 1 on X.
      // Overlap region: X=[0,1], so union bbox should be [-1, 2] on X.
      const solidA = makeCube();
      const solidB = makeCube([1, 0, 0]);

      const result = joinSolids(wasm, [solidA, solidB], [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ]);

      const bbox = result.solid.boundingBox();
      expect(bbox.min[0]).toBeCloseTo(-1, 1);
      expect(bbox.max[0]).toBeCloseTo(2, 1);
      expect(bbox.min[1]).toBeCloseTo(-1, 1);
      expect(bbox.max[1]).toBeCloseTo(1, 1);

      // Volume: two 8-unit cubes with 2-unit overlap = 8 + 8 - 4 = 12.
      expect(result.solid.volume()).toBeCloseTo(12, 0);

      result.solid.delete();
      solidA.delete();
      solidB.delete();
    });

    test('joins two non-overlapping cubes', ({ expect }) => {
      const solidA = makeCube();
      const solidB = makeCube([5, 0, 0]);

      const result = joinSolids(wasm, [solidA, solidB], [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ]);

      // Volume: 8 + 8 = 16 (no overlap).
      expect(result.solid.volume()).toBeCloseTo(16, 0);

      result.solid.delete();
      solidA.delete();
      solidB.delete();
    });

    test('joins three cubes', ({ expect }) => {
      const solidA = makeCube();
      const solidB = makeCube([1, 0, 0]);
      const solidC = makeCube([0, 1, 0]);

      const result = joinSolids(wasm, [solidA, solidB, solidC], [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ]);

      const bbox = result.solid.boundingBox();
      expect(bbox.min[0]).toBeCloseTo(-1, 1);
      expect(bbox.max[0]).toBeCloseTo(2, 1);
      expect(bbox.max[1]).toBeCloseTo(2, 1);

      result.solid.delete();
      solidA.delete();
      solidB.delete();
      solidC.delete();
    });

    test('result position matches first solid position', ({ expect }) => {
      const solidA = makeCube();
      const solidB = makeCube([1, 0, 0]);

      const posA = { x: 3, y: 0, z: 0 };
      const posB = { x: 4, y: 0, z: 0 };
      const result = joinSolids(wasm, [solidA, solidB], [posA, posB]);

      // Result position should be posA.
      expect(result.position.x).toBe(3);
      expect(result.position.y).toBe(0);
      expect(result.position.z).toBe(0);

      result.solid.delete();
      solidA.delete();
      solidB.delete();
    });
  });

  describe('subtractSolids', () => {
    test('subtracts overlapping cube from another', ({ expect }) => {
      // A at origin, B offset by 1 on X. A - B removes the overlap slab.
      const solidA = makeCube();
      const solidB = makeCube([1, 0, 0]);

      const result = subtractSolids(wasm, [solidA, solidB], [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ]);

      const bbox = result.solid.boundingBox();
      // After subtracting B from A, X range should be [-1, 0] (the non-overlapping part of A).
      expect(bbox.min[0]).toBeCloseTo(-1, 1);
      expect(bbox.max[0]).toBeCloseTo(0, 1);

      // Volume: A=8, overlap region = 1*2*2 = 4, result = 4.
      expect(result.solid.volume()).toBeCloseTo(4, 0);

      result.solid.delete();
      solidA.delete();
      solidB.delete();
    });

    test('subtracts two cubes from first (A - B - C)', ({ expect }) => {
      // A is a 4x2x2 cube at origin. B and C are 2x2x2 cubes at each end.
      const solidA = wasm.Manifold.cube([4, 2, 2], true);
      const solidB = makeCube([1, 0, 0]);
      const solidC = makeCube([-1, 0, 0]);

      const result = subtractSolids(wasm, [solidA, solidB, solidC], [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ]);

      // A volume = 16. B removes overlap [0,1]*2*2=4. C removes overlap [-1,0]*2*2=4.
      // But B and C overlap at [-1,1] with A. After A-B-C, the remaining is the center strip.
      // Let's just verify volume decreased.
      expect(result.solid.volume()).toBeLessThan(16);

      result.solid.delete();
      solidA.delete();
      solidB.delete();
      solidC.delete();
    });

    test('subtracting non-overlapping cube leaves original intact', ({ expect }) => {
      const solidA = makeCube();
      const solidB = makeCube([10, 0, 0]);

      const result = subtractSolids(wasm, [solidA, solidB], [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ]);

      // No overlap, volume should be unchanged.
      expect(result.solid.volume()).toBeCloseTo(8, 0);

      result.solid.delete();
      solidA.delete();
      solidB.delete();
    });

    test('result position matches first solid position', ({ expect }) => {
      const solidA = makeCube();
      const solidB = makeCube([1, 0, 0]);

      const posA = { x: 5, y: 2, z: 0 };
      const posB = { x: 6, y: 2, z: 0 };
      const result = subtractSolids(wasm, [solidA, solidB], [posA, posB]);

      expect(result.position.x).toBe(5);
      expect(result.position.y).toBe(2);
      expect(result.position.z).toBe(0);

      result.solid.delete();
      solidA.delete();
      solidB.delete();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run plugin-spacetime:test -- src/engine/boolean-ops.test.ts`
Expected: FAIL — `boolean-ops` module not found.

- [ ] **Step 3: Implement `joinSolids` and `subtractSolids`**

Create `src/engine/boolean-ops.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import type { Manifold, ManifoldToplevel } from 'manifold-3d';

import { type Model } from '../types';

/** Result of a boolean operation: the combined solid and its world position. */
export type BooleanResult = {
  /** The resulting Manifold solid (in local space relative to position). */
  solid: Manifold;
  /** World position for the result (matches the first input object). */
  position: Model.Vec3;
};

/**
 * Translates a solid from its local space to world space relative to a reference position.
 * The solid's vertices are shifted so that object positions are accounted for in the boolean.
 */
const toWorldSpace = (solid: Manifold, objectPos: Model.Vec3, refPos: Model.Vec3): Manifold => {
  const dx = objectPos.x - refPos.x;
  const dy = objectPos.y - refPos.y;
  const dz = objectPos.z - refPos.z;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6 && Math.abs(dz) < 1e-6) {
    return solid;
  }
  return solid.translate([dx, dy, dz]);
};

/**
 * Joins (unions) multiple solids into a single solid.
 * Each solid is translated to world space relative to the first object's position.
 * The result position is that of the first object.
 */
export const joinSolids = (
  wasm: ManifoldToplevel,
  solids: Manifold[],
  positions: Model.Vec3[],
): BooleanResult => {
  const refPos = positions[0];
  const translated: Manifold[] = [];

  for (let idx = 0; idx < solids.length; idx++) {
    translated.push(toWorldSpace(solids[idx], positions[idx], refPos));
  }

  let result = translated[0];
  for (let idx = 1; idx < translated.length; idx++) {
    const next = wasm.Manifold.union(result, translated[idx]);
    if (result !== translated[0]) {
      result.delete();
    }
    // Clean up translated copies (but not the first, which may be the original solid).
    if (translated[idx] !== solids[idx]) {
      translated[idx].delete();
    }
    result = next;
  }

  return { solid: result, position: { ...refPos } };
};

/**
 * Subtracts solids[1..n] from solids[0] (A - B - C - ...).
 * Each solid is translated to world space relative to the first object's position.
 * The result position is that of the first object.
 */
export const subtractSolids = (
  wasm: ManifoldToplevel,
  solids: Manifold[],
  positions: Model.Vec3[],
): BooleanResult => {
  const refPos = positions[0];
  const translated: Manifold[] = [];

  for (let idx = 0; idx < solids.length; idx++) {
    translated.push(toWorldSpace(solids[idx], positions[idx], refPos));
  }

  let result = translated[0];
  for (let idx = 1; idx < translated.length; idx++) {
    const next = wasm.Manifold.difference(result, translated[idx]);
    if (result !== translated[0]) {
      result.delete();
    }
    if (translated[idx] !== solids[idx]) {
      translated[idx].delete();
    }
    result = next;
  }

  return { solid: result, position: { ...refPos } };
};
```

- [ ] **Step 4: Add barrel export**

In `src/engine/index.ts`, add:
```typescript
export * from './boolean-ops';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `moon run plugin-spacetime:test -- src/engine/boolean-ops.test.ts`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/boolean-ops.ts src/engine/boolean-ops.test.ts src/engine/index.ts
git commit -m "feat(plugin-spacetime): add boolean ops engine (join/subtract) with tests"
```

---

## Task 2: Multi-Object Selection Type

**Files:**
- Modify: `src/tools/tool-context.ts`

- [ ] **Step 1: Extend Selection type with MultiObjectSelection**

In `src/tools/tool-context.ts`, add a new selection variant and update the union:

```typescript
/** Multi-object selection (ordered). */
export type MultiObjectSelection = {
  type: 'multi-object';
  /** Ordered list of selected objects (first = primary). */
  entries: Array<{ objectId: string; mesh: Mesh }>;
};

/** Shared selection state that persists across tool switches. */
export type Selection = ObjectSelection | FaceSelection | MultiObjectSelection;
```

Also add a helper:

```typescript
/** Returns all selected object IDs from any selection type. */
export const getSelectedObjectIds = (selection: Selection | null): string[] => {
  if (!selection) {
    return [];
  }
  if (selection.type === 'multi-object') {
    return selection.entries.map((entry) => entry.objectId);
  }
  return [selection.objectId];
};
```

- [ ] **Step 2: Build to verify types compile**

Run: `moon run plugin-spacetime:build`
Expected: PASS (no consumers of the new type yet, existing code unaffected).

- [ ] **Step 3: Commit**

```bash
git add src/tools/tool-context.ts
git commit -m "feat(plugin-spacetime): add MultiObjectSelection type to selection model"
```

---

## Task 3: Multi-Select in SelectTool

**Files:**
- Modify: `src/tools/impl/select-tool.ts`
- Modify: `src/components/SpacetimeCanvas/SpacetimeCanvas.tsx`

- [ ] **Step 1: Update SelectTool to handle shift-click in object mode**

In `src/tools/impl/select-tool.ts`, modify `onPointerDown` to handle shift-click:

```typescript
if (ctx.selectionState.selectionMode === 'object') {
  const event = info.event as PointerEvent;

  if (event.shiftKey) {
    // Multi-select: toggle this object in/out of the selection list.
    const current = ctx.selection;
    if (current?.type === 'multi-object') {
      const exists = current.entries.findIndex((entry) => entry.objectId === objectId);
      if (exists >= 0) {
        // Remove from multi-selection.
        const next = current.entries.filter((_, idx) => idx !== exists);
        if (next.length === 1) {
          // Collapse back to single selection.
          ctx.setSelection({ type: 'object', objectId: next[0].objectId, mesh: next[0].mesh, highlightMesh: null });
        } else if (next.length === 0) {
          ctx.setSelection(null);
        } else {
          ctx.setSelection({ type: 'multi-object', entries: next });
        }
      } else {
        // Add to multi-selection.
        ctx.setSelection({
          type: 'multi-object',
          entries: [...current.entries, { objectId, mesh }],
        });
      }
    } else if (current?.type === 'object') {
      // Promote single selection to multi.
      if (current.objectId === objectId) {
        // Shift-clicking already selected object: deselect.
        ctx.setSelection(null);
      } else {
        ctx.setSelection({
          type: 'multi-object',
          entries: [
            { objectId: current.objectId, mesh: current.mesh },
            { objectId, mesh },
          ],
        });
      }
    } else {
      // No selection or face selection: start fresh.
      ctx.setSelection({ type: 'object', objectId, mesh, highlightMesh: null });
    }
    return true;
  }

  // Normal click: single select.
  ctx.setSelection({ type: 'object', objectId, mesh, highlightMesh: null });
  return true;
}
```

- [ ] **Step 2: Update `setSelection` in SpacetimeCanvas to handle MultiObjectSelection highlights**

In `SpacetimeCanvas.tsx`, extend the `setSelection` handler:

```typescript
// Apply new selection.
selectionRef.current = next;
if (next?.type === 'object') {
  highlightLayer.addMesh(next.mesh, theme.selected);
} else if (next?.type === 'face' && next.highlightMesh) {
  highlightLayer.addMesh(next.highlightMesh, theme.selected);
} else if (next?.type === 'multi-object') {
  for (const entry of next.entries) {
    highlightLayer.addMesh(entry.mesh, theme.selected);
  }
}
```

Also update the cleanup logic for previous selection:

```typescript
// Clean up previous selection.
const prev = selectionRef.current;
if (prev) {
  if (prev.type === 'multi-object') {
    for (const entry of prev.entries) {
      highlightLayer.removeMesh(entry.mesh);
    }
  } else {
    if (prev.highlightMesh) {
      highlightLayer.removeMesh(prev.highlightMesh);
      prev.highlightMesh.dispose();
    }
    if (prev.type === 'object') {
      highlightLayer.removeMesh(prev.mesh);
    }
  }
}
```

Update `onSelectionChange` reporting to pass all IDs:

```typescript
if (next?.type === 'multi-object') {
  onSelectionChangeRef.current?.(next.entries[0]?.objectId ?? null);
} else {
  onSelectionChangeRef.current?.(next?.objectId ?? null);
}
```

- [ ] **Step 3: Build to verify compilation**

Run: `moon run plugin-spacetime:build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/impl/select-tool.ts src/components/SpacetimeCanvas/SpacetimeCanvas.tsx
git commit -m "feat(plugin-spacetime): add shift-click multi-object selection"
```

---

## Task 4: Move All Selected Objects

**Files:**
- Modify: `src/tools/impl/move-tool.ts`

- [ ] **Step 1: Extend MoveTool DragState for multi-object**

Add a `companions` field to `DragState` for additional dragged objects:

```typescript
type DragState = {
  objectId: string;
  mesh: Mesh;
  startPosition: Vector3;
  dragOrigin: Vector3;
  plane: Plane;
  /** Other objects being moved along (multi-select). */
  companions: Array<{ objectId: string; mesh: Mesh; startPosition: Vector3 }>;
};
```

- [ ] **Step 2: Update onPointerDown to capture all selected objects**

After setting up the primary drag object, add companions from multi-selection:

```typescript
// Collect companions from multi-selection.
const companions: DragState['companions'] = [];
if (ctx.selection?.type === 'multi-object') {
  for (const entry of ctx.selection.entries) {
    if (entry.objectId !== objectId) {
      companions.push({
        objectId: entry.objectId,
        mesh: entry.mesh,
        startPosition: entry.mesh.position.clone(),
      });
    }
  }
}

this._drag = { objectId, mesh, startPosition, dragOrigin, plane, companions };
```

- [ ] **Step 3: Update onPointerMove to move all companions**

After updating the primary mesh position, apply the same delta to companions:

```typescript
// Move companions by the same delta.
const delta = newPos.subtract(this._drag.startPosition);
for (const companion of this._drag.companions) {
  const companionPos = companion.startPosition.add(delta);
  if (event.shiftKey) {
    companionPos.x = snapToGrid(companionPos.x);
    companionPos.y = snapToGrid(companionPos.y);
    companionPos.z = snapToGrid(companionPos.z);
  }
  companion.mesh.position = companionPos;
}
```

- [ ] **Step 4: Update onPointerUp to commit all companion positions**

After committing the primary object, commit companions:

```typescript
// Commit companion positions.
for (const companion of this._drag.companions) {
  const companionObj = ctx.getObject(companion.objectId);
  if (companionObj) {
    Obj.change(companionObj, (obj) => {
      obj.position = {
        x: companion.mesh.position.x,
        y: companion.mesh.position.y,
        z: companion.mesh.position.z,
      };
    });
  }
}
```

- [ ] **Step 5: Build to verify**

Run: `moon run plugin-spacetime:build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/tools/impl/move-tool.ts
git commit -m "feat(plugin-spacetime): move all selected objects in multi-select"
```

---

## Task 5: Vertical Axis Movement (Cmd/Alt Modifier)

**Files:**
- Modify: `src/tools/impl/move-tool.ts`

- [ ] **Step 1: Update onPointerDown to detect modifier and choose drag plane**

Replace the fixed horizontal plane with a conditional:

```typescript
// Detect platform modifier: metaKey (Cmd on macOS) or altKey (Alt on Windows/Linux).
const useVertical = startEvent.metaKey || startEvent.altKey;

let plane: Plane;
let dragOrigin: Vector3;

if (useVertical) {
  // Vertical drag: project onto a plane facing the camera that passes through the object.
  // Use camera direction projected onto XZ to get a vertical plane normal.
  const cameraDir = ctx.camera.getForwardRay().direction;
  const planeNormal = new Vector3(cameraDir.x, 0, cameraDir.z).normalize();
  plane = Plane.FromPositionAndNormal(startPosition, planeNormal);
} else {
  // Horizontal drag: project onto XZ ground plane at object's Y level.
  plane = Plane.FromPositionAndNormal(new Vector3(0, startPosition.y, 0), Vector3.Up());
}

const startRay = ctx.scene.createPickingRay(startEvent.clientX, startEvent.clientY, null, ctx.camera);
const startDist = startRay.intersectsPlane(plane);
if (startDist === null) {
  return false;
}
dragOrigin = startRay.origin.add(startRay.direction.scale(startDist));
```

- [ ] **Step 2: Update onPointerMove to constrain axis based on mode**

After computing the point on the drag plane:

```typescript
const point = ray.origin.add(ray.direction.scale(distance));
let delta = point.subtract(this._drag.dragOrigin);

// If vertical mode, only keep Y component.
if (this._drag.vertical) {
  delta = new Vector3(0, delta.y, 0);
}
```

Add `vertical: boolean` to `DragState` and set it in `onPointerDown`.

- [ ] **Step 3: Build and verify**

Run: `moon run plugin-spacetime:build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/impl/move-tool.ts
git commit -m "feat(plugin-spacetime): cmd/alt modifier for vertical axis movement"
```

---

## Task 6: Keyboard Shortcuts

**Files:**
- Modify: `src/components/SpacetimeCanvas/SpacetimeCanvas.tsx`

- [ ] **Step 1: Add keydown listener in the canvas initialization effect**

Inside the `getManifold().then(...)` block, after setting up the tool manager, add:

```typescript
// Keyboard shortcuts scoped to canvas focus.
const handleKeyDown = (event: KeyboardEvent) => {
  // Skip if focus is in a text input.
  const target = event.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return;
  }

  switch (event.key.toLowerCase()) {
    case 'm':
      onToolChangeRef.current?.({ tool: 'move' });
      break;
    case 'e':
      onToolChangeRef.current?.({ tool: 'extrude' });
      break;
    case 'x':
    case 'backspace':
      onDeleteRef.current?.();
      break;
  }
};

canvas.setAttribute('tabindex', '0');
canvas.addEventListener('keydown', handleKeyDown);
```

Add cleanup in the return function:
```typescript
canvas.removeEventListener('keydown', handleKeyDown);
```

- [ ] **Step 2: Add refs for callbacks**

Add refs that the keyboard handler can use (near the other refs):

```typescript
const onToolChangeRef = useRef<((next: Partial<{ tool: string }>) => void) | null>(null);
const onDeleteRef = useRef<(() => void) | null>(null);
```

- [ ] **Step 3: Update SpacetimeCanvasProps to accept the callbacks**

```typescript
export type SpacetimeCanvasProps = {
  // ... existing props ...
  onToolChange?: (next: Partial<{ tool: string }>) => void;
  onDelete?: () => void;
};
```

Wire them in the component body:
```typescript
onToolChangeRef.current = onToolChange ?? null;
onDeleteRef.current = onDelete ?? null;
```

- [ ] **Step 4: Pass callbacks from SpacetimeEditorCanvas**

In `SpacetimeEditor.tsx`, pass `onToolChange` and `onDelete` to the canvas:

```typescript
<SpacetimeCanvas
  // ... existing props ...
  onToolChange={onToolChange}
  onDelete={editorActions.onDeleteSelected}
/>
```

- [ ] **Step 5: Build and verify**

Run: `moon run plugin-spacetime:build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/SpacetimeCanvas/SpacetimeCanvas.tsx src/components/SpacetimeEditor/SpacetimeEditor.tsx
git commit -m "feat(plugin-spacetime): add keyboard shortcuts (m/e/x) scoped to canvas"
```

---

## Task 7: Boolean Operation Toolbar Actions and Editor Wiring

**Files:**
- Modify: `src/components/SpacetimeToolbar/actions.ts`
- Modify: `src/components/SpacetimeToolbar/SpacetimeToolbar.tsx`
- Modify: `src/components/SpacetimeEditor/SpacetimeEditor.tsx`
- Modify: `src/components/SpacetimeCanvas/SpacetimeCanvas.tsx`

- [ ] **Step 1: Extend EditorActions with join/subtract**

In `actions.ts`, update the `EditorActions` type:

```typescript
export type EditorActions = {
  onAddObject: () => void;
  onDeleteSelected: () => void;
  onImport: () => void;
  onExportSTL: () => void;
  onJoinSelected: () => void;
  onSubtractSelected: () => void;
};
```

Add the actions to `createEditorActions`:

```typescript
export const createEditorActions =
  (actions: EditorActions): ActionGroupBuilderFn =>
  (builder) =>
    builder
      .action(
        'add-object',
        { label: ['action.add-object.label', { ns: meta.id }], icon: 'ph--plus--regular' },
        actions.onAddObject,
      )
      .action(
        'delete-object',
        { label: ['action.delete-object.label', { ns: meta.id }], icon: 'ph--trash--regular' },
        actions.onDeleteSelected,
      )
      .separator('line')
      .action(
        'join-objects',
        { label: ['action.join-objects.label', { ns: meta.id }], icon: 'ph--unite-square--regular' },
        actions.onJoinSelected,
      )
      .action(
        'subtract-objects',
        { label: ['action.subtract-objects.label', { ns: meta.id }], icon: 'ph--subtract-square--regular' },
        actions.onSubtractSelected,
      )
      .separator('line')
      .action(
        'import',
        { label: ['action.import.label', { ns: meta.id }], icon: 'ph--upload-simple--regular' },
        actions.onImport,
      )
      .action(
        'export',
        { label: ['action.export.label', { ns: meta.id }], icon: 'ph--download-simple--regular' },
        actions.onExportSTL,
      );
```

- [ ] **Step 2: Add translation keys**

In the translations file (`src/translations.ts`), add:

```typescript
'action.join-objects.label': 'Join',
'action.subtract-objects.label': 'Subtract',
```

- [ ] **Step 3: Implement handleJoinSelected in SpacetimeEditor**

In `SpacetimeEditor.tsx`, add the handler:

```typescript
const handleJoinSelected = useCallback(() => {
  if (!scene || !solidsRef.current) {
    return;
  }

  // Gather selected object IDs (from multi-selection or just the single selected object).
  // Need at least 2 objects.
  const selectedIds = selectedObjectIds;
  if (selectedIds.length < 2) {
    return;
  }

  // Collect solids and positions in selection order.
  const solids: Manifold[] = [];
  const positions: Model.Vec3[] = [];
  const objectsToDelete: string[] = [];

  for (const objId of selectedIds) {
    const solid = solidsRef.current.get(objId);
    const obj = findObject(scene, objId);
    if (!solid || !obj) {
      continue;
    }
    solids.push(solid);
    positions.push({ x: obj.position.x, y: obj.position.y, z: obj.position.z });
    objectsToDelete.push(objId);
  }

  if (solids.length < 2) {
    return;
  }

  const result = joinSolids(wasmRef.current!, solids, positions);

  // Serialize result mesh for ECHO storage.
  const meshData = serializeManifold(result.solid);

  // Create new ECHO object.
  const newObject = Model.make({
    primitive: undefined,
    mesh: meshData,
    position: result.position,
    color: findObject(scene, objectsToDelete[0])?.color,
  });

  // Delete source objects, add new one.
  Obj.change(scene, (obj) => {
    for (const objId of objectsToDelete) {
      const index = obj.objects.findIndex((ref) => (ref?.target as any)?.id === objId);
      if (index !== -1) {
        obj.objects.splice(index, 1);
      }
    }
    obj.objects.push(Ref.make(newObject));
  });
  Obj.setParent(newObject, scene);

  // Clean up canvas meshes/solids for deleted objects.
  for (const objId of objectsToDelete) {
    deleteObjectRef.current(objId);
  }

  const newObjId = (newObject as any).id as string;
  setSelectedObjectId(newObjId);
}, [scene, selectedObjectIds]);
```

- [ ] **Step 4: Implement handleSubtractSelected similarly**

Same pattern as join but using `subtractSolids` instead.

- [ ] **Step 5: Track selectedObjectIds as ordered array**

Replace `selectedObjectId: string | null` with tracking both single and multi IDs. The canvas `onSelectionChange` callback needs to report multi-select:

Update `SpacetimeCanvasProps`:
```typescript
onSelectionChange?: (objectIds: string[]) => void;
```

In `SpacetimeEditorRoot`, change state:
```typescript
const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
const selectedObjectId = selectedObjectIds[0] ?? null;
```

Update the canvas selection change handler to set the full array.

- [ ] **Step 6: Add `serializeManifold` helper**

Add a helper function that extracts mesh data from a Manifold solid and encodes it for ECHO:

```typescript
const serializeManifold = (solid: Manifold): Model.Mesh => {
  const meshData = solid.getMesh();
  const { vertProperties, triVerts, numProp } = meshData;
  const numVert = vertProperties.length / numProp;
  const positions = new Float32Array(numVert * 3);
  for (let vi = 0; vi < numVert; vi++) {
    positions[vi * 3] = vertProperties[vi * numProp];
    positions[vi * 3 + 1] = vertProperties[vi * numProp + 1];
    positions[vi * 3 + 2] = vertProperties[vi * numProp + 2];
  }
  return {
    vertexData: Model.encodeTypedArray(positions),
    indexData: Model.encodeTypedArray(new Uint32Array(triVerts)),
  };
};
```

This duplicates logic from `importGLBRef.current` in SpacetimeCanvas — extract it to a shared engine utility.

- [ ] **Step 7: Build and run all tests**

Run: `moon run plugin-spacetime:build && moon run plugin-spacetime:test`
Expected: PASS.

- [ ] **Step 8: Lint and format**

Run: `moon run plugin-spacetime:lint -- --fix && pnpm format`

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(plugin-spacetime): boolean join/subtract toolbar actions with multi-select"
```

---

## Task 8: Update SPEC.md and FRS.md

**Files:**
- Modify: `SPEC.md`
- Modify: `FRS.md`

- [ ] **Step 1: Mark Phase 4 items as complete in SPEC.md**

Update all Phase 4 checklist items from `- [ ]` to `- [x]`.

- [ ] **Step 2: Update pinch zoom status in Phase 2**

Mark the pinch zoom item as complete: `- [x] Implement pinch zoom.`

- [ ] **Step 3: Commit**

```bash
git add SPEC.md FRS.md
git commit -m "docs(plugin-spacetime): update spec and FRS for Phase 4 completion"
```

---

## Execution Order and Dependencies

```
Task 1 (boolean ops engine)     ──┐
Task 2 (multi-select type)      ──┤
                                  ├── Task 3 (multi-select in SelectTool)
Task 5 (vertical axis move)     ──┤     │
Task 6 (keyboard shortcuts)     ──┤     ├── Task 4 (move all selected)
                                  │     │
                                  └─────┴── Task 7 (boolean toolbar + editor wiring)
                                                │
                                                └── Task 8 (docs)
```

**Parallelizable:** Tasks 1, 2, 5, 6 are independent and can run concurrently.
**Sequential:** Task 3 depends on Task 2. Task 4 depends on Tasks 2+3. Task 7 depends on Tasks 1+3. Task 8 is last.
