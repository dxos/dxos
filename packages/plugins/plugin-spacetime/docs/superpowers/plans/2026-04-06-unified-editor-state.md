# Unified EditorState Atom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fragmented React state (6+ useState calls) with a single `EditorState` Atom that the toolbar subscribes to directly, the canvas writes selection into, and actions receive by reference.

**Architecture:** `EditorState` is a writable Atom created in `SpacetimeEditorRoot` and shared via Radix context. The canvas writes `selection` directly into the atom (replacing `selectionRef` + `onSelectionChange` callback). The toolbar reads from the atom via `useAtomValue` (reactive). Actions receive the atom's current value by reference — `selectedObjectIds` is derived from `selection` via `getSelectedObjectIds()`, eliminating the separate array and `selectionCount`. The `ToolContext.editorState` field gives tools access to the same shared state.

**Tech Stack:** `@effect-atom/atom-react` (Atom, useAtomValue, RegistryContext), React, TypeScript

---

## File Structure

### New Files

| File                        | Responsibility                                                                                                                                                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/tools/editor-state.ts` | `EditorState` type definition and `DEFAULT_EDITOR_STATE` constant. Replaces `EditorState` in `action.ts` and the separate `ToolState`, `ViewState`, `PropertiesState`, `SelectionState` types as the single source of truth. |

### Modified Files

| File                                                   | Changes                                                                                                                                                                                                         |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/tools/tool-context.ts`                            | Add `editorState: EditorState` to `ToolContext`. Remove `selectionState`, `selection`, `setSelection` (all now on editorState or managed through it).                                                           |
| `src/tools/action.ts`                                  | Remove `EditorState` type (moved to `editor-state.ts`). `ActionHandler.execute` now takes `(ctx: ToolContext)` — reads `ctx.editorState` directly. Remove `ActionResult` (actions mutate editorState directly). |
| `src/tools/tool-manager.ts`                            | `handleAction(id)` — no longer takes editorState param (reads from ctx).                                                                                                                                        |
| `src/tools/index.ts`                                   | Export `EditorState`, `DEFAULT_EDITOR_STATE` from `editor-state.ts`. Remove `ActionResult` export.                                                                                                              |
| `src/tools/actions/*.ts`                               | Read `editorState` from `ctx.editorState`. Write selection changes back. No return value.                                                                                                                       |
| `src/tools/tools/select-tool.ts`                       | Read `selectionMode` from `ctx.editorState.selectionMode`.                                                                                                                                                      |
| `src/components/SpacetimeCanvas/SpacetimeCanvas.tsx`   | Remove `selectionRef`, `onSelectionChange`, `selectedObjectId`, `selectedHue`, `selectionMode` props. Read/write via `editorStateRef` backed by the atom. Canvas `setSelection` writes to editorState.          |
| `src/components/SpacetimeEditor/SpacetimeEditor.tsx`   | Replace 6+ `useState` calls with one `Atom.make<EditorState>`. Context provides atom. `dispatchAction` simplified. Remove `selectedObjectIds`, `selectedObjectId`, `selectionState`, `selectionCount`.          |
| `src/components/SpacetimeToolbar/SpacetimeToolbar.tsx` | Receive `editorState` atom via context. Read via `useAtomValue`. Remove individual state props.                                                                                                                 |
| `src/components/SpacetimeToolbar/actions.ts`           | `createEditorActions` reads `selectionCount` from `getSelectedObjectIds(editorState.selection).length`.                                                                                                         |
| `src/components/SpacetimeToolbar/selection.ts`         | `createSelectionModeActions` reads from `editorState.selectionMode`.                                                                                                                                            |
| `src/components/SpacetimeToolbar/tools.tsx`            | `createToolActions` reads from `editorState.tool`.                                                                                                                                                              |
| `src/components/SpacetimeToolbar/view.ts`              | `createViewActions` reads from `editorState`.                                                                                                                                                                   |

---

## Task 1: Create EditorState Type and Update ToolContext

**Files:**

- Create: `src/tools/editor-state.ts`
- Modify: `src/tools/tool-context.ts`
- Modify: `src/tools/action.ts`
- Modify: `src/tools/tool-manager.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Create `src/tools/editor-state.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import { type Model } from '../types';

import { type Selection, type SelectionMode } from './tool-context';

/** Unified editor state shared between tools, actions, canvas, and toolbar. */
export type EditorState = {
  /** Active tool. */
  tool: string;
  /** Selection granularity mode. */
  selectionMode: SelectionMode;
  /** Show ground grid. */
  showGrid: boolean;
  /** Show debug panel. */
  showDebug: boolean;
  /** Current hue for new objects and selected object color. */
  hue: string;
  /** Currently selected template for new objects. */
  selectedTemplate: Model.ObjectTemplate;
  /** Canvas-level selection (includes Babylon mesh references). */
  selection: Selection | null;
};

/** Default editor state. */
export const DEFAULT_EDITOR_STATE: EditorState = {
  tool: 'select',
  selectionMode: 'object',
  showGrid: true,
  showDebug: false,
  hue: 'blue',
  selectedTemplate: 'cube',
  selection: null,
};
```

- [ ] **Step 2: Update `ToolContext` to include `editorState`**

In `src/tools/tool-context.ts`:

- Add `import { type EditorState } from './editor-state';`
- Add `editorState: EditorState;` field to `ToolContext`
- Remove `selectionState: SelectionState;` from `ToolContext` (tools read `ctx.editorState.selectionMode`)
- Keep `selection` and `setSelection` on `ToolContext` for now (they're still needed by tools for imperative access during pointer events; they'll be getters backed by editorState). Actually — keep `selection` as a getter and `setSelection` as the mutation function. The canvas will wire these to read/write `editorState.selection`.
- Remove `SelectionState` type (no longer needed — `selectionMode` is on EditorState, `selectionCount` is derived)

- [ ] **Step 3: Update `action.ts`**

Remove `EditorState` type (moved to `editor-state.ts`). Update `ActionHandler`:

```typescript
import { type ToolContext } from './tool-context';

/** Lifecycle interface for an action handler. */
export interface ActionHandler {
  readonly id: string;
  /** Execute the action. Reads/writes editorState via ctx.editorState. */
  execute(ctx: ToolContext): void;
}
```

Remove `ActionResult` type — actions now mutate `ctx.editorState.selection` directly (e.g., set selection to the new object after add/join).

- [ ] **Step 4: Update `tool-manager.ts`**

`handleAction` no longer takes `editorState`:

```typescript
handleAction(id: string): void {
  const handler = this._actions.get(id);
  if (!handler || !this._ctx) {
    return;
  }
  log.info('handleAction', { id });
  handler.execute(this._ctx);
}
```

- [ ] **Step 5: Update `src/tools/index.ts`**

```typescript
export { type EditorState, DEFAULT_EDITOR_STATE } from './editor-state';
export type { Tool } from './tool';
export type {
  ToolContext,
  Selection,
  ObjectSelection,
  FaceSelection,
  MultiObjectSelection,
  SelectionMode,
} from './tool-context';
export { ToolManager } from './tool-manager';
export { getSelectedObjectIds } from './tool-context';
```

Remove `ActionResult` export. Remove `SelectionState` export.

- [ ] **Step 6: Build (expect failures in action handlers and components — that's OK)**

Run: `moon run plugin-spacetime:build 2>&1 | grep "error TS" | wc -l`
Note the count. We'll fix these in subsequent tasks.

- [ ] **Step 7: Commit**

```bash
git commit -m "refactor(plugin-spacetime): create unified EditorState type and update ToolContext"
```

---

## Task 2: Update Action Handlers

**Files:**

- Modify: `src/tools/actions/add-object.ts`
- Modify: `src/tools/actions/delete-objects.ts`
- Modify: `src/tools/actions/join-objects.ts`
- Modify: `src/tools/actions/subtract-objects.ts`

All four actions follow the same pattern change:

- `execute(ctx: ToolContext)` — no `editorState` param
- Read from `ctx.editorState` (e.g., `ctx.editorState.selectedTemplate`, `ctx.editorState.hue`)
- Derive `selectedObjectIds` via `getSelectedObjectIds(ctx.editorState.selection)`
- Instead of returning `ActionResult`, set selection directly: `ctx.setSelection({ type: 'object', objectId, mesh, highlightMesh: null })` — but we don't have the mesh yet (it's created reactively by the canvas). So for add/join/subtract, we should set `editorState.selection = null` and let the canvas sync effect select the new object. OR: store a `pendingSelectObjectId` on editorState that the canvas picks up.

**Decision:** Add `pendingSelectId: string | null` to `EditorState`. Actions set it. Canvas sync effect reads it, selects the object, and clears it. This is clean — actions don't need Babylon mesh references.

- [ ] **Step 1: Add `pendingSelectId` to EditorState**

In `editor-state.ts`, add:

```typescript
/** Object ID to select after the next canvas sync (set by actions, cleared by canvas). */
pendingSelectId: string | null;
```

Default: `null`.

- [ ] **Step 2: Update `add-object.ts`**

```typescript
export class AddObjectAction implements ActionHandler {
  readonly id = 'add-object';

  execute(ctx: ToolContext): void {
    const scene = ctx.echoScene;
    const { selectedTemplate, hue } = ctx.editorState;
    if (!scene) {
      return;
    }

    log.info('AddObjectAction.execute', { template: selectedTemplate, hue });

    // ... (same object creation logic) ...

    const objId = (object as any).id as string | undefined;
    if (objId) {
      ctx.editorState.pendingSelectId = objId;
    }
  }
}
```

- [ ] **Step 3: Update `delete-objects.ts`**

```typescript
execute(ctx: ToolContext): void {
  const scene = ctx.echoScene;
  const selectedObjectIds = getSelectedObjectIds(ctx.editorState.selection);
  if (!scene || selectedObjectIds.length === 0) {
    return;
  }

  log.info('DeleteObjectsAction.execute', { count: selectedObjectIds.length });
  ctx.setSelection(null);
  // ... (same ECHO removal + dispose logic) ...
}
```

- [ ] **Step 4: Update `join-objects.ts` and `subtract-objects.ts`**

Same pattern: read `selectedObjectIds` from `getSelectedObjectIds(ctx.editorState.selection)`, set `ctx.editorState.pendingSelectId` for the new object.

- [ ] **Step 5: Build to verify actions compile**

Run: `moon run plugin-spacetime:build`

- [ ] **Step 6: Commit**

```bash
git commit -m "refactor(plugin-spacetime): update action handlers to read from ctx.editorState"
```

---

## Task 3: Update SpacetimeEditor to Use Atom

**Files:**

- Modify: `src/components/SpacetimeEditor/SpacetimeEditor.tsx`

This is the biggest change. Replace 6+ `useState` calls with one `Atom.make<EditorState>`.

- [ ] **Step 1: Replace state management in SpacetimeEditorRoot**

Remove: `toolState`, `selectionState`, `viewState`, `selectedObjectIds`, `selectedObjectId`, `setSelectedObjectId`, `setSelectedObjectIds`, `selectedTemplate`, `propertiesState`, `handleActionRef`, `dispatchAction`, all individual `handleXxxChange` callbacks (except `handlePropertiesChange` for hue-to-ECHO sync).

Add:

```typescript
import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { DEFAULT_EDITOR_STATE, type EditorState, getSelectedObjectIds } from '../../tools';

// In component:
const registry = useContext(RegistryContext);
const editorStateAtom = useMemo(() => Atom.make<EditorState>(DEFAULT_EDITOR_STATE), []);
const editorState = useAtomValue(editorStateAtom);

const updateEditorState = useCallback(
  (next: Partial<EditorState>) => {
    registry.set(editorStateAtom, { ...registry.get(editorStateAtom), ...next });
  },
  [registry, editorStateAtom],
);
```

- [ ] **Step 2: Simplify context value**

`SpacetimeEditorContextValue` becomes:

```typescript
type SpacetimeEditorContextValue = {
  scene?: Scene.Scene;
  editorStateAtom: Atom.Writable<EditorState>;
  editorActions: EditorActions;
  handleActionRef: React.MutableRefObject<(actionId: string) => void>;
  solidsRef: RefObject<Map<string, import('manifold-3d').Manifold> | null>;
  importGLBRef: RefObject<...>;
};
```

- [ ] **Step 3: Simplify dispatchAction**

```typescript
const dispatchAction = useCallback((actionId: string): void => {
  handleActionRef.current(actionId);
}, []);
```

No need to construct EditorState — actions read from `ctx.editorState`.

- [ ] **Step 4: Simplify editorActions**

```typescript
const editorActions: EditorActions = useMemo(
  () => ({
    onAdd: () => dispatchAction('add-object'),
    onDeleteSelected: () => dispatchAction('delete-objects'),
    onJoinSelected: () => dispatchAction('join-objects'),
    onSubtractSelected: () => dispatchAction('subtract-objects'),
    onImport: handleImport,
    onExport: handleExport,
  }),
  [dispatchAction, handleImport, handleExport],
);
```

- [ ] **Step 5: Hue sync effect**

Use `editorState` from atom:

```typescript
const selectedObjectId = getSelectedObjectIds(editorState.selection)[0] ?? null;

useEffect(() => {
  if (!selectedObjectId || !scene?.objects) return;
  for (const ref of scene.objects) {
    const obj = ref?.target;
    if (obj && (obj as any).id === selectedObjectId && (obj as any).color) {
      updateEditorState({ hue: (obj as any).color });
      return;
    }
  }
}, [selectedObjectId, scene]);
```

- [ ] **Step 6: Commit**

```bash
git commit -m "refactor(plugin-spacetime): replace useState calls with EditorState atom in editor"
```

---

## Task 4: Update SpacetimeCanvas to Read/Write EditorState

**Files:**

- Modify: `src/components/SpacetimeCanvas/SpacetimeCanvas.tsx`

- [ ] **Step 1: Replace individual props with editorState access**

Remove props: `selectionMode`, `selectedObjectId`, `selectedHue`, `onSelectionChange`, `onToolChange`, `onDelete`, `handleActionRef`, `tool`.

Add prop: `editorStateRef: React.RefObject<EditorState>` (a ref to the atom's current value, kept in sync by the editor).

Actually — better: pass `editorStateAtom` and `registry` so the canvas can read/write directly. But the canvas init is in a `useEffect` closure, so it needs stable references. A ref works better for the imperative code inside the WASM init.

Best approach: the canvas receives a mutable `editorState` object via ref. The editor keeps it synced with the atom. The canvas reads/writes it directly. When the canvas writes `selection`, the editor sees the change via atom subscription and the toolbar re-renders.

**BUT**: if the canvas writes to a plain object ref, the atom won't know. We need the canvas to write through the atom. So pass `registry` + `editorStateAtom` to the canvas, and in the `setSelection` handler:

```typescript
registry.set(editorStateAtom, { ...registry.get(editorStateAtom), selection: next });
```

This triggers atom subscribers (toolbar re-renders with updated disabled states).

- [ ] **Step 2: Wire ToolContext.editorState as a getter**

In the ToolContext setup:

```typescript
get editorState() {
  return registry.get(editorStateAtom);
},
```

Tools read `ctx.editorState` — always gets the latest value.

- [ ] **Step 3: setSelection writes to atom**

Replace the `onSelectionChangeRef.current?.(...)` calls with:

```typescript
registry.set(editorStateAtom, { ...registry.get(editorStateAtom), selection: next });
```

- [ ] **Step 4: Read tool/selectionMode/hue from editorState**

The canvas `useEffect` for syncing active tool reads from `editorState.tool` instead of props.
The color sync effect reads from `editorState.hue` and `editorState.selection`.
The `selectionModeRef` is replaced by `ctx.editorState.selectionMode`.

- [ ] **Step 5: Keyboard shortcuts write to atom**

```typescript
case 'm':
  registry.set(editorStateAtom, { ...registry.get(editorStateAtom), tool: 'move' });
  break;
```

And the ToolManager syncs: add a `registry.subscribe(editorStateAtom, ...)` that calls `toolManager.setActiveTool(editorState.tool)` when `tool` changes.

- [ ] **Step 6: Handle pendingSelectId in canvas sync effect**

After adding meshes for new objects, check `editorState.pendingSelectId` and select it:

```typescript
const pending = registry.get(editorStateAtom).pendingSelectId;
if (pending) {
  const mesh = meshesRef.current.get(pending);
  if (mesh && setSelectionRef.current) {
    setSelectionRef.current({ type: 'object', objectId: pending, mesh, highlightMesh: null });
  }
  registry.set(editorStateAtom, { ...registry.get(editorStateAtom), pendingSelectId: null });
}
```

- [ ] **Step 7: Build and test**

Run: `moon run plugin-spacetime:build && moon run plugin-spacetime:test`

- [ ] **Step 8: Commit**

```bash
git commit -m "refactor(plugin-spacetime): canvas reads/writes EditorState atom"
```

---

## Task 5: Update Toolbar to Read EditorState Atom Directly

**Files:**

- Modify: `src/components/SpacetimeToolbar/SpacetimeToolbar.tsx`
- Modify: `src/components/SpacetimeToolbar/actions.ts`
- Modify: `src/components/SpacetimeToolbar/tools.tsx`
- Modify: `src/components/SpacetimeToolbar/selection.ts`
- Modify: `src/components/SpacetimeToolbar/view.ts`
- Modify: `src/components/SpacetimeToolbar/properties.ts`

- [ ] **Step 1: Simplify SpacetimeToolbar props**

Remove all individual state props. Receive `editorStateAtom` and `registry` (or receive the atom from context).

```typescript
export type SpacetimeToolbarProps = Pick<MenuRootProps, 'attendableId' | 'alwaysActive'> & {
  editorActions: EditorActions;
  editorStateAtom: Atom.Writable<EditorState>;
};
```

The toolbar reads state via `useAtomValue(editorStateAtom)` and writes via `registry.set(editorStateAtom, ...)`.

- [ ] **Step 2: Update createToolbarActions**

The function takes `editorState` (current value), `editorActions`, and an `update` function:

```typescript
const createToolbarActions = (
  editorState: EditorState,
  editorActions: EditorActions,
  update: (next: Partial<EditorState>) => void,
): Atom.Atom<ActionGraphProps> => {
  const selectedObjectIds = getSelectedObjectIds(editorState.selection);
  return Atom.make(() =>
    MenuBuilder.make()
      .subgraph(createSelectionModeActions(editorState.selectionMode, (mode) => update({ selectionMode: mode })))
      .separator('line')
      .subgraph(createToolActions(editorState.tool, (tool) => update({ tool })))
      .separator('line')
      .subgraph(createTemplateSelector(editorState.selectedTemplate, (t) => update({ selectedTemplate: t })))
      .separator('line')
      .subgraph(createEditorActions(editorActions, selectedObjectIds.length))
      .separator()
      .subgraph(createViewActions(editorState, update))
      .build(),
  );
};
```

- [ ] **Step 3: Simplify sub-builders**

Each sub-builder (tools.tsx, selection.ts, view.ts) takes simple values + callback instead of typed state objects. The `ToolState`, `ViewState`, `PropertiesState`, `SelectionState` types are removed (their fields live on EditorState now).

- [ ] **Step 4: Update SpacetimeEditorToolbar**

Reads atom from context, passes to toolbar:

```typescript
const { editorStateAtom, editorActions } = useSpacetimeEditorContext(...);
return <SpacetimeToolbar editorStateAtom={editorStateAtom} editorActions={editorActions} />;
```

- [ ] **Step 5: Remove dead types**

Delete `PropertiesState` from `properties.ts` (hue lives on EditorState).
`ToolState` removed from `tools.tsx` (tool lives on EditorState).
`ViewState` removed from `view.ts` (showGrid/showDebug live on EditorState).
`SelectionState` removed from `tool-context.ts` (already done in Task 1).

- [ ] **Step 6: Build, test, lint, format**

Run: `moon run plugin-spacetime:build && moon run plugin-spacetime:test && moon run plugin-spacetime:lint -- --fix && pnpm format`

- [ ] **Step 7: Commit**

```bash
git commit -m "refactor(plugin-spacetime): toolbar reads EditorState atom directly, remove state prop drilling"
```

---

## Execution Order

```
Task 1 (types) → Task 2 (actions) → Task 3 (editor) → Task 4 (canvas) → Task 5 (toolbar)
```

All tasks are sequential. Each builds on the previous.

## Key Eliminations

After this refactoring, the following are removed:

- `ToolState`, `ViewState`, `PropertiesState`, `SelectionState` types
- `ActionResult` type
- `selectedObjectIds` / `selectedObjectId` / `setSelectedObjectId` / `setSelectedObjectIds` in editor
- `selectionCount` field
- `onSelectionChange` callback (canvas → editor)
- `onToolChange`, `onViewChange`, `onSelectionChange`, `onPropertiesChange`, `onSelectedTemplateChange` callbacks
- ~10 individual props passed through SpacetimeEditorToolbar
- `handleActionRef` (ToolManager is accessed directly or via a simpler ref)
- `selectionRef` in canvas (replaced by `editorState.selection` via atom)
