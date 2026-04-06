# Action Handler Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract editor action logic (add, delete, join, subtract) from SpacetimeEditor React component into standalone ActionHandler classes dispatched by ToolManager, making domain operations testable and React-independent.

**Architecture:** ActionHandler is a new interface (parallel to Tool) with `id` and `execute(ctx, editorState)`. ToolManager gains `registerAction` / `handleAction` methods. Each action lives in its own file under `src/tools/actions/`. Actions operate on ToolContext (scene, meshes, solids, manifold) and receive EditorState (selectedObjectIds, selectedTemplate, hue) from the editor. They return an ActionResult that the editor applies to React state. The canvas exposes `handleAction` via a ref; the editor's toolbar callbacks become thin wrappers.

**Tech Stack:** TypeScript, ECHO (`Obj`, `Ref`), Manifold (`manifold-3d`), React (refs only at the boundary)

---

## File Structure

### New Files

| File                                    | Responsibility                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/tools/action.ts`                   | `ActionHandler` interface, `EditorState` type, `ActionResult` type, `disposeSceneObject` helper. |
| `src/tools/actions/index.ts`            | Barrel exports for all action handlers.                                                          |
| `src/tools/actions/add-object.ts`       | `AddObjectAction` — creates a new primitive or preset ECHO object in the scene.                  |
| `src/tools/actions/delete-objects.ts`   | `DeleteObjectsAction` — removes selected objects from ECHO scene and disposes meshes/solids.     |
| `src/tools/actions/join-objects.ts`     | `JoinObjectsAction` — boolean union of selected objects into one.                                |
| `src/tools/actions/subtract-objects.ts` | `SubtractObjectsAction` — boolean difference (A - B - C) of selected objects.                    |

### Modified Files

| File                                                 | Changes                                                                                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/tools/tool-manager.ts`                          | Add `_actions` map, `registerAction()`, `handleAction()`.                                                                                                    |
| `src/tools/index.ts`                                 | Add barrel exports for action types and handlers.                                                                                                            |
| `src/components/SpacetimeCanvas/SpacetimeCanvas.tsx` | Add `handleActionRef` prop, register actions on ToolManager, wire the ref. Remove `deleteObjectRef` prop.                                                    |
| `src/components/SpacetimeEditor/SpacetimeEditor.tsx` | Replace inline action handlers with `handleActionRef.current(id, editorState)` calls. Remove `deleteObjectRef`, `wasmRef`, `findObject`, `performBooleanOp`. |

---

## Task 1: ActionHandler Types and ToolManager Extension

**Files:**

- Create: `src/tools/action.ts`
- Modify: `src/tools/tool-manager.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Create `src/tools/action.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import type { Mesh } from '@babylonjs/core';

import { type Model } from '../types';

import { type ToolContext } from './tool-context';

/** Editor-side state passed to actions (React state the action cannot access directly). */
export type EditorState = {
  /** Ordered list of currently selected object IDs. */
  selectedObjectIds: string[];
  /** Currently selected template for new objects. */
  selectedTemplate: Model.ObjectTemplate;
  /** Current hue for new objects. */
  hue: string;
};

/** Result returned by an action to the editor for React state updates. */
export type ActionResult = {
  /** Object IDs to select after the action completes. */
  selectObjectIds?: string[];
};

/** Lifecycle interface for an action handler. */
export interface ActionHandler {
  /** Unique action identifier (matches toolbar action id). */
  readonly id: string;
  /** Execute the action. Returns result for the editor to apply, or undefined if no-op. */
  execute(ctx: ToolContext, editorState: EditorState): ActionResult | undefined;
}

/**
 * Disposes a scene object's Babylon mesh and Manifold solid from the runtime maps.
 * Does NOT modify ECHO — callers must handle ECHO mutations separately.
 */
export const disposeSceneObject = (ctx: ToolContext, objectId: string): void => {
  const mesh = ctx.meshes.get(objectId);
  if (mesh) {
    mesh.dispose();
    ctx.meshes.delete(objectId);
  }
  const solid = ctx.solids.get(objectId);
  if (solid) {
    solid.delete();
    ctx.solids.delete(objectId);
  }
};
```

- [ ] **Step 2: Extend ToolManager with action registration and dispatch**

In `src/tools/tool-manager.ts`, add the imports and new members:

```typescript
import { type ActionHandler, type ActionResult, type EditorState } from './action';
```

Add to the class:

```typescript
  private readonly _actions = new Map<string, ActionHandler>();

  /** Register an action handler. */
  registerAction(handler: ActionHandler): void {
    this._actions.set(handler.id, handler);
  }

  /** Dispatch an action by id. Returns the result, or undefined if action not found or no context. */
  handleAction(id: string, editorState: EditorState): ActionResult | undefined {
    const handler = this._actions.get(id);
    if (!handler || !this._ctx) {
      return undefined;
    }
    return handler.execute(this._ctx, editorState);
  }
```

Update `dispose()` to also clear actions:

```typescript
  dispose(): void {
    if (this._activeTool && this._ctx) {
      this._activeTool.deactivate(this._ctx);
    }
    this._activeTool = null;
    this._ctx = null;
    this._tools.clear();
    this._actions.clear();
  }
```

- [ ] **Step 3: Update barrel exports in `src/tools/index.ts`**

Add:

```typescript
export { type ActionHandler, type EditorState, type ActionResult, disposeSceneObject } from './action';
```

- [ ] **Step 4: Build to verify**

Run: `moon run plugin-spacetime:build`
Expected: PASS (no consumers yet).

- [ ] **Step 5: Commit**

```bash
git add src/tools/action.ts src/tools/tool-manager.ts src/tools/index.ts
git commit -m "feat(plugin-spacetime): add ActionHandler interface and ToolManager dispatch"
```

---

## Task 2: Implement AddObjectAction

**Files:**

- Create: `src/tools/actions/add-object.ts`
- Create: `src/tools/actions/index.ts`

- [ ] **Step 1: Create `src/tools/actions/add-object.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';

import { parseOBJ, presetObjData } from '../../engine';
import { Model } from '../../types';
import { type ActionHandler, type ActionResult, type EditorState } from '../action';
import { type ToolContext } from '../tool-context';

/** Creates a new primitive or preset object in the scene. */
export class AddObjectAction implements ActionHandler {
  readonly id = 'add-object';

  execute(ctx: ToolContext, editorState: EditorState): ActionResult | undefined {
    const scene = ctx.echoScene;
    if (!scene) {
      return undefined;
    }

    const { selectedTemplate, hue } = editorState;
    const objData = presetObjData[selectedTemplate as Model.PresetType];
    let object: Model.Object;

    if (objData) {
      const parsed = parseOBJ(objData);
      if (!parsed) {
        return undefined;
      }
      object = Model.make({
        primitive: undefined,
        label: selectedTemplate,
        mesh: {
          vertexData: Model.encodeTypedArray(parsed.positions),
          indexData: Model.encodeTypedArray(parsed.indices),
        },
        color: hue,
      });
    } else {
      object = Model.make({
        primitive: selectedTemplate as Model.PrimitiveType,
        color: hue,
      });
    }

    Obj.change(scene, (sceneObj) => {
      sceneObj.objects.push(Ref.make(object));
    });
    Obj.setParent(object, scene);

    const objId = (object as any).id as string | undefined;
    return objId ? { selectObjectIds: [objId] } : undefined;
  }
}
```

- [ ] **Step 2: Create `src/tools/actions/index.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

export { AddObjectAction } from './add-object';
```

- [ ] **Step 3: Build to verify**

Run: `moon run plugin-spacetime:build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/actions/
git commit -m "feat(plugin-spacetime): add AddObjectAction handler"
```

---

## Task 3: Implement DeleteObjectsAction

**Files:**

- Create: `src/tools/actions/delete-objects.ts`
- Modify: `src/tools/actions/index.ts`

- [ ] **Step 1: Create `src/tools/actions/delete-objects.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';

import { type ActionHandler, type ActionResult, type EditorState, disposeSceneObject } from '../action';
import { type ToolContext } from '../tool-context';

/** Deletes selected objects from the ECHO scene and disposes their runtime resources. */
export class DeleteObjectsAction implements ActionHandler {
  readonly id = 'delete-objects';

  execute(ctx: ToolContext, editorState: EditorState): ActionResult | undefined {
    const scene = ctx.echoScene;
    const { selectedObjectIds } = editorState;
    if (!scene || selectedObjectIds.length === 0) {
      return undefined;
    }

    // Clear selection before disposing meshes (handles highlight cleanup).
    ctx.setSelection(null);

    // Remove from ECHO scene.
    Obj.change(scene, (sceneObj) => {
      for (const objId of selectedObjectIds) {
        const index = sceneObj.objects.findIndex((ref) => (ref?.target as any)?.id === objId);
        if (index !== -1) {
          sceneObj.objects.splice(index, 1);
        }
      }
    });

    // Dispose runtime meshes and solids.
    for (const objId of selectedObjectIds) {
      disposeSceneObject(ctx, objId);
    }

    return { selectObjectIds: [] };
  }
}
```

- [ ] **Step 2: Add export to `src/tools/actions/index.ts`**

```typescript
export { DeleteObjectsAction } from './delete-objects';
```

- [ ] **Step 3: Build to verify**

Run: `moon run plugin-spacetime:build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/actions/delete-objects.ts src/tools/actions/index.ts
git commit -m "feat(plugin-spacetime): add DeleteObjectsAction handler"
```

---

## Task 4: Implement JoinObjectsAction

**Files:**

- Create: `src/tools/actions/join-objects.ts`
- Modify: `src/tools/actions/index.ts`

- [ ] **Step 1: Create `src/tools/actions/join-objects.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import type { Manifold } from 'manifold-3d';

import { joinSolids, serializeManifold } from '../../engine';
import { Model } from '../../types';
import { type ActionHandler, type ActionResult, type EditorState, disposeSceneObject } from '../action';
import { type ToolContext } from '../tool-context';

/** Joins (unions) selected objects into a single merged object. */
export class JoinObjectsAction implements ActionHandler {
  readonly id = 'join-objects';

  execute(ctx: ToolContext, editorState: EditorState): ActionResult | undefined {
    const scene = ctx.echoScene;
    const { selectedObjectIds } = editorState;
    if (!scene || selectedObjectIds.length < 2) {
      return undefined;
    }

    const solids: Manifold[] = [];
    const positions: Model.Vec3[] = [];
    const objectsToDelete: string[] = [];

    for (const objId of selectedObjectIds) {
      const solid = ctx.solids.get(objId);
      const obj = ctx.getObject(objId);
      if (!solid || !obj) {
        continue;
      }
      solids.push(solid);
      positions.push({ x: obj.position.x, y: obj.position.y, z: obj.position.z });
      objectsToDelete.push(objId);
    }

    if (solids.length < 2) {
      return undefined;
    }

    const result = joinSolids(ctx.manifold, solids, positions);
    const meshData = serializeManifold(result.solid);
    const firstObj = ctx.getObject(objectsToDelete[0]);

    const newObject = Model.make({
      primitive: undefined,
      mesh: meshData,
      position: result.position,
      color: firstObj?.color,
    });

    // Clear selection before disposing.
    ctx.setSelection(null);

    Obj.change(scene, (sceneObj) => {
      for (const objId of objectsToDelete) {
        const index = sceneObj.objects.findIndex((ref) => (ref?.target as any)?.id === objId);
        if (index !== -1) {
          sceneObj.objects.splice(index, 1);
        }
      }
      sceneObj.objects.push(Ref.make(newObject));
    });
    Obj.setParent(newObject, scene);

    for (const objId of objectsToDelete) {
      disposeSceneObject(ctx, objId);
    }

    result.solid.delete();

    const newObjId = (newObject as any).id as string;
    return { selectObjectIds: [newObjId] };
  }
}
```

- [ ] **Step 2: Add export to `src/tools/actions/index.ts`**

```typescript
export { JoinObjectsAction } from './join-objects';
```

- [ ] **Step 3: Build to verify**

Run: `moon run plugin-spacetime:build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/actions/join-objects.ts src/tools/actions/index.ts
git commit -m "feat(plugin-spacetime): add JoinObjectsAction handler"
```

---

## Task 5: Implement SubtractObjectsAction

**Files:**

- Create: `src/tools/actions/subtract-objects.ts`
- Modify: `src/tools/actions/index.ts`

- [ ] **Step 1: Create `src/tools/actions/subtract-objects.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import type { Manifold } from 'manifold-3d';

import { subtractSolids, serializeManifold } from '../../engine';
import { Model } from '../../types';
import { type ActionHandler, type ActionResult, type EditorState, disposeSceneObject } from '../action';
import { type ToolContext } from '../tool-context';

/** Subtracts selected objects from the first selected object (A - B - C). */
export class SubtractObjectsAction implements ActionHandler {
  readonly id = 'subtract-objects';

  execute(ctx: ToolContext, editorState: EditorState): ActionResult | undefined {
    const scene = ctx.echoScene;
    const { selectedObjectIds } = editorState;
    if (!scene || selectedObjectIds.length < 2) {
      return undefined;
    }

    const solids: Manifold[] = [];
    const positions: Model.Vec3[] = [];
    const objectsToDelete: string[] = [];

    for (const objId of selectedObjectIds) {
      const solid = ctx.solids.get(objId);
      const obj = ctx.getObject(objId);
      if (!solid || !obj) {
        continue;
      }
      solids.push(solid);
      positions.push({ x: obj.position.x, y: obj.position.y, z: obj.position.z });
      objectsToDelete.push(objId);
    }

    if (solids.length < 2) {
      return undefined;
    }

    const result = subtractSolids(ctx.manifold, solids, positions);
    const meshData = serializeManifold(result.solid);
    const firstObj = ctx.getObject(objectsToDelete[0]);

    const newObject = Model.make({
      primitive: undefined,
      mesh: meshData,
      position: result.position,
      color: firstObj?.color,
    });

    ctx.setSelection(null);

    Obj.change(scene, (sceneObj) => {
      for (const objId of objectsToDelete) {
        const index = sceneObj.objects.findIndex((ref) => (ref?.target as any)?.id === objId);
        if (index !== -1) {
          sceneObj.objects.splice(index, 1);
        }
      }
      sceneObj.objects.push(Ref.make(newObject));
    });
    Obj.setParent(newObject, scene);

    for (const objId of objectsToDelete) {
      disposeSceneObject(ctx, objId);
    }

    result.solid.delete();

    const newObjId = (newObject as any).id as string;
    return { selectObjectIds: [newObjId] };
  }
}
```

- [ ] **Step 2: Add export to `src/tools/actions/index.ts`**

```typescript
export { SubtractObjectsAction } from './subtract-objects';
```

- [ ] **Step 3: Build to verify**

Run: `moon run plugin-spacetime:build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/actions/subtract-objects.ts src/tools/actions/index.ts
git commit -m "feat(plugin-spacetime): add SubtractObjectsAction handler"
```

---

## Task 6: Wire Actions into Canvas and Editor

**Files:**

- Modify: `src/components/SpacetimeCanvas/SpacetimeCanvas.tsx`
- Modify: `src/components/SpacetimeEditor/SpacetimeEditor.tsx`

This is the integration task. The canvas registers actions on ToolManager and exposes `handleAction` via a ref. The editor's action callbacks become thin wrappers that call through the ref and apply the ActionResult to React state.

- [ ] **Step 1: Update SpacetimeCanvas**

Add to `SpacetimeCanvasProps`:

```typescript
  /** Ref for editor to dispatch actions through ToolManager. */
  handleActionRef?: React.MutableRefObject<
    (actionId: string, editorState: EditorState) => ActionResult | undefined
  >;
```

Import the action classes and types:

```typescript
import {
  ToolManager,
  SelectTool,
  MoveTool,
  ExtrudeTool,
  type Selection,
  type EditorState,
  type ActionResult,
} from '../../tools';
import { AddObjectAction, DeleteObjectsAction, JoinObjectsAction, SubtractObjectsAction } from '../../tools/actions';
```

After `toolManager.register(new ExtrudeTool());`, register the actions:

```typescript
toolManager.registerAction(new AddObjectAction());
toolManager.registerAction(new DeleteObjectsAction());
toolManager.registerAction(new JoinObjectsAction());
toolManager.registerAction(new SubtractObjectsAction());
```

After `toolManager.setActiveTool(tool ?? 'select');`, wire the ref:

```typescript
if (handleActionRef) {
  handleActionRef.current = (actionId, editorState) => toolManager.handleAction(actionId, editorState);
}
```

Destructure `handleActionRef` in the component props.

Remove `deleteObjectRef` from props (no longer needed — actions handle cleanup directly). Keep the inline mesh disposal in the canvas ECHO sync effect (for reactive object removal) but remove the `deleteObjectRef` callback setup.

- [ ] **Step 2: Update SpacetimeEditor**

Remove imports: `joinSolids`, `subtractSolids`, `serializeManifold`, `getManifold`, `Manifold`, `ManifoldToplevel`.

Add import: `type EditorState, type ActionResult` from `../../tools`.

Remove state/refs: `wasmRef`, `findObject`, `performBooleanOp`, `deleteObjectRef`, the `useEffect` for `getManifold`.

Add ref:

```typescript
const handleActionRef = useRef<(actionId: string, editorState: EditorState) => ActionResult | undefined>(
  () => undefined,
);
```

Helper to build editor state and dispatch:

```typescript
const dispatchAction = useCallback(
  (actionId: string): void => {
    const editorState: EditorState = {
      selectedObjectIds,
      selectedTemplate,
      hue: propertiesState.hue,
    };
    const result = handleActionRef.current(actionId, editorState);
    if (result?.selectObjectIds) {
      setSelectedObjectIds(result.selectObjectIds);
    }
  },
  [selectedObjectIds, selectedTemplate, propertiesState.hue],
);
```

Replace action handlers:

```typescript
const handleAdd = useCallback(() => dispatchAction('add-object'), [dispatchAction]);
const handleDeleteSelected = useCallback(() => dispatchAction('delete-objects'), [dispatchAction]);
const handleJoinSelected = useCallback(() => dispatchAction('join-objects'), [dispatchAction]);
const handleSubtractSelected = useCallback(() => dispatchAction('subtract-objects'), [dispatchAction]);
```

Import/export stay as-is (UI-bound).

Update SpacetimeEditorContextValue: remove `deleteObjectRef`, add `handleActionRef`.

Update SpacetimeEditorCanvas: replace `deleteObjectRef` with `handleActionRef`, pass to SpacetimeCanvas.

Update `onDelete` for keyboard shortcut:

```typescript
onDelete = { handleDeleteSelected };
```

- [ ] **Step 3: Build to verify**

Run: `moon run plugin-spacetime:build`
Expected: PASS.

- [ ] **Step 4: Run all tests**

Run: `moon run plugin-spacetime:test`
Expected: All 30 tests pass.

- [ ] **Step 5: Lint and format**

Run: `moon run plugin-spacetime:lint -- --fix && pnpm format`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(plugin-spacetime): wire action handlers through ToolManager dispatch"
```

---

## Execution Order

```
Task 1 (types + ToolManager) → Task 2 (add) → Task 3 (delete) → Task 4 (join) → Task 5 (subtract) → Task 6 (wire)
```

All tasks are sequential — each builds on the previous. Tasks 2-5 are structurally identical (one action handler each) and could be parallelized if the barrel export file is handled carefully, but sequential is safer.
