# tldraw Architecture & API Reference

Comprehensive analysis of the [tldraw](https://github.com/tldraw/tldraw) library (v3.x) and its integration with DXOS plugin-sketch.

## Table of Contents

1. [Package Structure](#1-package-structure)
2. [Core Architecture](#2-core-architecture)
3. [State & Reactivity System](#3-state--reactivity-system)
4. [Store Architecture](#4-store-architecture)
5. [Editor](#5-editor)
6. [Shape System](#6-shape-system)
7. [Tool System](#7-tool-system)
8. [Binding System](#8-binding-system)
9. [Rendering Pipeline](#9-rendering-pipeline)
10. [React Integration](#10-react-integration)
11. [UI Customization](#11-ui-customization)
12. [Persistence & Sync](#12-persistence--sync)
13. [Migration System](#13-migration-system)
14. [Asset Handling](#14-asset-handling)
15. [DXOS Integration](#15-dxos-integration)
16. [Critique & Suggestions](#16-critique--suggestions)

---

## 1. Package Structure

The tldraw monorepo contains 17 packages with a clear dependency hierarchy:

```
state -> store -> tlschema -> editor -> tldraw
                                          |
                              state-react (bridges signals to React)
```

| Package             | Purpose                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state`             | Custom signals/reactivity library (Atom, Computed, EffectScheduler, transactions).                                                                               |
| `state-react`       | React bindings: `track()` HOC, `useValue()` hook via `useSyncExternalStore`.                                                                                     |
| `store`             | Generic reactive record store with history, change listeners, side effects, validation, serialization.                                                           |
| `tlschema`          | Schema definitions for all record types (shapes, pages, cameras, instances, assets, bindings). Includes migrations and validation.                               |
| `validate`          | Runtime validation library used by schema and store.                                                                                                             |
| `editor`            | Core engine: `Editor` class, ShapeUtil/BindingUtil/AssetUtil, tool state machine, managers, geometry primitives (Box, Vec, Mat, Geometry2d), rendering pipeline. |
| `tldraw`            | Main entry point: bundles default shapes, tools, bindings, UI, canvas components, and the `<Tldraw />` React component.                                          |
| `sync-core`         | Core sync protocol logic for multiplayer collaboration.                                                                                                          |
| `sync`              | Higher-level sync layer with Cloudflare Durable Objects support.                                                                                                 |
| `utils`             | Shared utilities: `IndexKey` (fractional indexing), `uniqueId`, `compact`, `debounce`, `FileHelpers`, `PerformanceTracker`.                                      |
| `assets`            | Static assets (fonts, icons) for the default UI.                                                                                                                 |
| `driver`            | Platform-specific driver abstraction.                                                                                                                            |
| `mermaid`           | Mermaid diagram rendering integration.                                                                                                                           |
| `dotcom-shared`     | Shared utilities for tldraw.com hosted product.                                                                                                                  |
| `worker-shared`     | Shared utilities for Cloudflare Worker deployments.                                                                                                              |
| `create-tldraw`     | CLI scaffolding tool (`npx create-tldraw@latest`).                                                                                                               |
| `namespaced-tldraw` | Namespaced variant of the tldraw package.                                                                                                                        |

---

## 2. Core Architecture

tldraw follows a layered architecture with clear separation of concerns:

```
+----------------------------------------------------------+
|  <Tldraw /> React Component                              |
|  (default shapes, tools, bindings, UI, asset handlers)   |
+----------------------------------------------------------+
|  Editor                                                   |
|  (orchestrator: 13 managers, state machine, computed      |
|   properties, shape/binding/asset util registries)        |
+----------------------------------------------------------+
|  TLStore                                                  |
|  (reactive record store with history, side effects,       |
|   listeners, queries, schema validation)                  |
+----------------------------------------------------------+
|  @tldraw/state                                            |
|  (Atom, Computed, EffectScheduler, transactions)          |
+----------------------------------------------------------+
```

Key design principles:

- **Record-oriented data model**: Everything is a typed record with `id` and `typeName`. Records are scoped as `document` (persisted/synced), `session` (local-only), or `presence` (synced but not persisted).
- **Fine-grained reactivity**: Custom signals library with atoms, computed values, and effect schedulers. React components subscribe to exactly the signals they read.
- **Hierarchical state machine**: Tools are state machines with nested states. Events bubble through the hierarchy.
- **Extension via composition**: Custom shapes, tools, bindings, and UI components are injected via props rather than subclassing the editor.

---

## 3. State & Reactivity System

tldraw implements its own fine-grained reactivity system (similar to Solid.js/Preact signals).

### Atom

Writable signal -- the fundamental reactive primitive.

```ts
import { atom } from '@tldraw/state';

const count = atom('count', 0);
count.get(); // 0 (creates dependency if inside computed/effect)
count.set(1); // triggers dependents
count.update((n) => n + 1); // functional update
```

- Supports custom equality via `isEqual` option.
- Optional `historyLength` + `computeDiff` for incremental updates.
- Each mutation advances a global epoch counter.

### Computed

Derived signal -- lazily evaluated, cached until dependencies change.

```ts
import { computed } from '@tldraw/state';

const doubled = computed('doubled', () => count.get() * 2);
doubled.get(); // 2 (recomputes only when count changes)
```

- Uses parent-tracking: captures which signals are read during computation via `startCapturingParents()` / `stopCapturingParents()`.
- `withDiff()` allows computed signals to provide incremental diffs.

### EffectScheduler

Runs side-effects when tracked dependencies change.

```ts
import { react } from '@tldraw/state';

const stop = react('logger', () => {
  console.log('Count is:', count.get());
});
```

- Supports custom scheduling (e.g., batching with `requestAnimationFrame`).
- Tracks `lastTraversedEpoch` and `lastReactedEpoch` to skip unnecessary re-runs.

### Transactions

```ts
import { transact } from '@tldraw/state';

transact(() => {
  count.set(10);
  name.set('foo');
  // Effects only run after the transaction completes.
});
```

---

## 4. Store Architecture

`Store<R extends UnknownRecord>` is the reactive record container.

### Data Model

Records are stored in an `AtomMap<Id, R>` -- each record is its own atom, enabling fine-grained reactivity.

```ts
store.get(id); // Reactive read (tracks dependency)
store.unsafeGetWithoutCapture(id); // Non-reactive read
store.put([record]); // Add or update
store.remove([id]); // Delete
```

### Change Tracking

Every mutation produces a `RecordsDiff<R>`:

```ts
type RecordsDiff<R> = {
  added: Record<IdOf<R>, R>;
  updated: Record<IdOf<R>, [from: R, to: R]>;
  removed: Record<IdOf<R>, R>;
};
```

The `store.history` atom increments on every change, carrying the diff. Adjacent entries from the same source are squashed.

### Listeners

```ts
store.listen(
  (entry: HistoryEntry<R>) => {
    // entry.changes: RecordsDiff<R>
    // entry.source: 'user' | 'remote'
  },
  {
    source: 'user', // 'user' | 'remote' | 'all'
    scope: 'document', // 'document' | 'session' | 'presence' | 'all'
  },
);
```

- `source: 'user'` -- local changes only.
- `source: 'remote'` -- changes applied via `mergeRemoteChanges()`.
- `scope` -- filters by record type scope.

### Side Effects

`StoreSideEffects` provides lifecycle hooks per record type:

```ts
store.sideEffects.registerBeforeCreateHandler('shape', (record, source) => {
  return { ...record, meta: { ...record.meta, createdAt: Date.now() } };
});

store.sideEffects.registerBeforeDeleteHandler('shape', (record) => {
  return false; // Prevent deletion.
});
```

Available hooks: `beforeCreate`, `afterCreate`, `beforeChange`, `afterChange`, `beforeDelete`, `afterDelete`, `operationComplete`.

### Serialization

```ts
store.getStoreSnapshot(scope); // Returns { store, schema }
store.loadStoreSnapshot(snapshot); // Migrates then replaces all data
store.serialize(scope); // Data only, filtered by scope
```

### Computed Caches

```ts
store.createComputedCache('bounds', (record) => {
  return computeBounds(record);
});
```

Per-record memoized derived data that auto-updates when records change and cleans up on deletion.

---

## 5. Editor

The `Editor` class (~11,400 lines) extends `EventEmitter<TLEventMap>` and orchestrates the entire drawing experience.

### Construction

```ts
const editor = new Editor({
  store: TLStore,
  shapeUtils: TLAnyShapeUtilConstructor[],
  bindingUtils: TLAnyBindingUtilConstructor[],
  assetUtils: TLAnyAssetUtilConstructor[],
  tools: TLStateNodeConstructor[],
  getContainer: () => HTMLElement,
  getShapeVisibility?: (shape) => 'visible' | 'hidden' | 'inherit',
  themes?: Partial<TLThemes>,
  colorScheme?: 'light' | 'dark' | 'system',
  options?: Partial<TldrawOptions>,
});
```

### 13 Manager Subsystems

| Manager                  | Responsibility                        |
| ------------------------ | ------------------------------------- |
| `ClickManager`           | Click detection and double-click.     |
| `EdgeScrollManager`      | Auto-scroll when dragging near edges. |
| `FocusManager`           | Editor focus tracking.                |
| `FontManager`            | Font loading.                         |
| `HistoryManager`         | Undo/redo stacks.                     |
| `InputsManager`          | Pointer/keyboard state.               |
| `ScribbleManager`        | Free-drawing scribble effects.        |
| `SnapManager`            | Snapping guides.                      |
| `SpatialIndexManager`    | R-tree spatial indexing for shapes.   |
| `TextManager`            | Text measurement.                     |
| `ThemeManager`           | Theme/color scheme management.        |
| `TickManager`            | `requestAnimationFrame` tick loop.    |
| `UserPreferencesManager` | User settings.                        |

### Key Computed Properties

All use the `@computed` decorator for reactive derivation:

- `getPath()` -- current tool state path (e.g., `"select.idle"`).
- `getCurrentTool()` / `getCurrentToolId()`.
- `getInstanceState()` -- current editor instance state.
- `getSelectedShapeIds()` / `getSelectedShapes()`.
- `getRenderingShapes()` -- shapes to render with computed opacity and z-order.
- `getCurrentPageShapesInReadingOrder()`.
- `canUndo()` / `canRedo()`.

### Key Methods

```ts
// Shape CRUD
editor.createShapes([{ type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }]);
editor.updateShape({ id, type, props: { color: 'red' } });
editor.deleteShapes([id]);
editor.getShape(id);

// Selection
editor.select(id);
editor.selectAll();
editor.setSelectedShapes([id1, id2]);

// History
editor.undo();
editor.redo();
editor.mark('my-operation');

// Batching
editor.run(() => {
  editor.createShapes([...]);
  editor.updateShape({ ... });
}, { history: 'record' });

// Camera
editor.setCamera({ x, y, z });
editor.zoomToFit();
editor.centerOnPoint(point);
```

---

## 6. Shape System

### Schema Definition

Every shape extends `TLBaseShape<Type, Props>`:

```ts
type TLBaseShape<Type, Props> = {
  id: TLShapeId; // 'shape:uniqueId'
  typeName: 'shape';
  type: Type; // String literal discriminator
  x: number;
  y: number;
  rotation: number;
  index: IndexKey; // Fractional indexing for ordering
  parentId: TLParentId; // page:* or shape:* (for frames/groups)
  isLocked: boolean;
  opacity: number;
  props: Props;
  meta: JsonObject;
};
```

Props use `@tldraw/validate` validators and `StyleProp` for style-based properties:

```ts
const geoShapeProps: RecordProps<TLGeoShape> = {
  geo: GeoShapeGeoStyle, // StyleProp enum
  w: T.nonZeroNumber, // Plain validator
  color: DefaultColorStyle, // StyleProp (sticky across creations)
  richText: richTextValidator,
};
```

Built-in shape types: arrow, bookmark, draw, embed, frame, geo, group, highlight, image, line, note, text, video.

### ShapeUtil

Abstract class -- one per shape type. Receives `Editor` in constructor.

**Required methods:**

```ts
abstract class ShapeUtil<Shape> {
  static type: string;
  static props?: RecordProps<Shape>;
  static migrations?: MigrationSequence;

  abstract getDefaultProps(): Shape['props'];
  abstract getGeometry(shape: Shape): Geometry2d;
  abstract component(shape: Shape): JSX.Element;
  abstract indicator(shape: Shape): JSX.Element;
}
```

**Capability flags** (override to change behavior):

`canSnap`, `canBind`, `canEdit`, `canResize`, `canCrop`, `canScroll`, `isAspectRatioLocked`, `hideResizeHandles`, `hideRotateHandle`, `providesBackgroundForChildren`.

**Lifecycle callbacks:**

`onBeforeCreate`, `onBeforeUpdate`, `onResize`, `onTranslate`, `onRotate`, `onHandleDrag`, `onDoubleClick`, `onClick`, `onEditStart`, `onEditEnd`, `onChildrenChange`, `onDragShapesIn`, `onDropShapesOver`.

**Export:** `toSvg(shape, ctx)`, `toBackgroundSvg(shape, ctx)`.

**Customization without subclassing:**

```ts
const CustomGeo = GeoShapeUtil.configure({
  getCustomDisplayValues: (shape, theme) => ({
    fill: myCustomFillColor,
  }),
});
```

### BaseBoxShapeUtil

Convenience base for rectangular shapes with `w`/`h` props. Provides default `getGeometry` (Rectangle2d), `onResize`, `getHandleSnapGeometry`, and `getInterpolatedProps`.

### Geometry System

`getGeometry()` returns `Geometry2d` subclasses that drive hit-testing, bounds calculation, snapping, and outlines:

- `Rectangle2d` -- rectangular shapes.
- `Group2d` -- composite geometry.
- Custom subclasses for complex outlines.

---

## 7. Tool System

Tools are hierarchical state machines built on `StateNode`.

### StateNode

```ts
abstract class StateNode {
  static id: string;
  static initial?: string; // Default child state
  static children(): StateNode[]; // Child state constructors
  static isLockable?: boolean; // Stay active after shape creation

  type: 'root' | 'branch' | 'leaf';
  parent: StateNode;

  enter(info, from): void;
  exit(info, to): void;
  transition(childId, info): void; // Supports dotted paths: 'select.resizing'
}
```

### Event Handling

Events dispatch to the current node, then bubble to the active child:

```ts
// Handler methods on StateNode:
onPointerDown(info): void;
onPointerMove(info): void;
onPointerUp(info): void;
onKeyDown(info): void;
onKeyUp(info): void;
onWheel(info): void;
onTick(info): void;
onCancel(): void;
onComplete(): void;
onInterrupt(): void;
```

### Shape Creation Flow

1. User selects tool (e.g., `geo`) -- editor transitions to `GeoShapeTool`.
2. Tool enters `idle` state, waiting for pointer events.
3. On pointer down, transitions to `pointing`.
4. On drag: creates a 1x1 shape, transitions to `select.resizing` with `isCreating: true`.
5. On click (no drag): creates shape at click point with default size.
6. Editor looks up `GeoShapeUtil` by type, calls `getDefaultProps()`.
7. Shape is added to store; `GeoShapeUtil.component()` renders it.

### BaseBoxShapeTool

Standard tool for creating box-like shapes:

```ts
abstract class BaseBoxShapeTool extends StateNode {
  static initial = 'idle';
  static children() {
    return [Idle, Pointing];
  }
  abstract shapeType: string;
  onCreate?(shape: TLShape | null): void;
}
```

---

## 8. Binding System

`BindingUtil` manages relationships between shapes (e.g., arrows bound to geo shapes).

```ts
abstract class BindingUtil<Binding> {
  static type: string;
  static props?: RecordProps<Binding>;

  // Lifecycle hooks:
  onBeforeCreate(binding): Binding;
  onAfterChange(binding): void;
  onBeforeDelete(binding): boolean;
  onAfterChangeFromShape(binding): void;
  onAfterChangeToShape(binding): void;

  // Isolation callbacks (copy, delete, duplicate):
  onBeforeIsolateFromShape(binding): void;
  onBeforeIsolateToShape(binding): void;
}
```

---

## 9. Rendering Pipeline

tldraw uses a **hybrid HTML + SVG** approach (not `<canvas>`).

### DOM Structure

```
<div class="tl-canvas">                     // Receives pointer/touch events
  <svg class="tl-svg-context">              // Shared <defs> (cursors, patterns)
    <Background />
    <GridWrapper />                          // SVG grid
  </svg>
  <div class="tl-html-layer tl-shapes">     // Shape rendering layer
    <ShapeWrapper>                           // Per-shape <div> with CSS transform
      <Shape />                              //   ShapeUtil.component()
    </ShapeWrapper>
    ...
  </div>
  <div class="tl-overlays">                 // Selection, handles, snap guides
    <CanvasShapeIndicators />
    <Brush /><Scribble /><ZoomBrush />
    <SnapIndicator /><SelectionForeground />
    <Handles /><LiveCollaborators />
  </div>
  <div>                                      // In front of canvas
    <RichTextToolbar /><ImageToolbar />
    <CursorChatBubble /><FollowingIndicator />
  </div>
</div>
```

### Shape Rendering

- Each shape gets a `<div>` positioned via CSS `transform: matrix(...)`.
- `ShapeUtil.component()` renders the shape content (HTML).
- `ShapeUtil.backgroundComponent()` renders behind other content.
- Shape culling is centralized via `ShapeCullingProvider` -- a single reactor updates `display: none` on off-screen shapes (O(1) subscriptions instead of O(N)).
- Z-ordering via CSS `z-index`.
- Camera/zoom applied via CSS `scale()` and `translate()` on HTML layers.

### Rendering Computation

`getRenderingShapes()` is a `@computed` method that:

1. Traverses the shape tree from `getSortedChildIdsForParent(page.id)`.
2. Recursively processes each shape and children.
3. Checks visibility, computes opacity (multiplicative with parent), handles erasing.
4. Assigns `index` and `backgroundIndex` for z-ordering.
5. Returns `TLRenderingShape[]` sorted by ID for stable DOM ordering.

---

## 10. React Integration

### `track()` HOC

Wraps a component to subscribe to signal changes during render:

```ts
const MyComponent = track(function MyComponent() {
  const editor = useEditor();
  const count = editor.getSelectedShapeIds().length;  // Reactive!
  return <div>{count} selected</div>;
});
```

Uses `useSyncExternalStore` internally for React 18+ concurrent mode compatibility. Also wraps with `React.memo()`.

### `useValue()` Hook

```ts
const count = useValue('selection-count', () => editor.getSelectedShapeIds().length, [editor]);
```

### `<Tldraw>` Component

```tsx
<Tldraw
  store={myStore}                    // External store (or let tldraw create one)
  shapeUtils={[MyShapeUtil]}         // Custom shapes
  tools={[MyTool]}                   // Custom tools
  components={{ Toolbar: MyToolbar }} // UI overrides
  overrides={{ actions, tools }}      // Behavioral overrides
  onMount={(editor) => { ... }}      // Post-mount callback
  hideUi={false}                     // Show/hide all UI
  autoFocus={true}
  colorScheme="system"
  initialState="select"              // First active tool
/>
```

**Store creation options** (alternative to passing `store`):

```tsx
<Tldraw
  persistenceKey='my-drawing' // Auto-persist to localStorage
  snapshot={savedSnapshot} // Load from snapshot
  migrations={[myMigrations]} // Custom migrations
/>
```

---

## 11. UI Customization

### Component Overrides

The `components` prop accepts overrides for both editor-level and UI-level components:

**Editor components** (canvas rendering):

`Background`, `Canvas`, `Grid`, `Brush`, `ZoomBrush`, `Cursor`, `CollaboratorCursor`, `CollaboratorHint`, `Scribble`, `SelectionForeground`, `SelectionBackground`, `Handle`, `Handles`, `ShapeIndicator`, `SnapIndicator`, `InFrontOfTheCanvas`, `OnTheCanvas`, `Overlays`, `ErrorFallback`.

**UI components** (chrome):

`ContextMenu`, `ActionsMenu`, `HelpMenu`, `ZoomMenu`, `MainMenu`, `Minimap`, `StylePanel`, `PageMenu`, `NavigationPanel`, `Toolbar`, `RichTextToolbar`, `KeyboardShortcutsDialog`, `QuickActions`, `HelperButtons`, `DebugPanel`, `MenuPanel`, `TopPanel`, `SharePanel`, `Dialogs`, `Toasts`.

Set any to `null` to disable.

### Behavioral Overrides

```ts
const overrides: TLUiOverrides = {
  actions(editor, actions, helpers) {
    actions['my-action'] = {
      id: 'my-action',
      label: 'My Action',
      kbd: '$m', // Cmd+M
      onSelect(source) {
        /* ... */
      },
    };
    return actions;
  },
  tools(editor, tools, helpers) {
    tools['my-tool'] = {
      id: 'my-tool',
      icon: 'my-icon',
      label: 'My Tool',
      kbd: 't',
      onSelect(source) {
        editor.setCurrentTool('my-tool');
      },
    };
    return tools;
  },
  translations: { en: { 'my-action': 'My Custom Action' } },
};
```

### UI Layout

```
+---MenuPanel---+---TopPanel---+---SharePanel/StylePanel---+
|               |              |                            |
|               |   Canvas     |                            |
|               |              |                            |
+---NavigationPanel---+---Toolbar---+---HelpMenu-----------+
```

Focus mode replaces all chrome with a single toggle button.

### Keyboard Shortcuts

Uses `hotkeys-js`. Syntax: `!` = Shift, `$` = Cmd/Ctrl, `?` = Alt.

```ts
// Examples:
'$z'; // Cmd+Z (undo)
'!$z'; // Cmd+Shift+Z (redo)
'$i'; // Cmd+I (insert embed)
```

---

## 12. Persistence & Sync

### Local Persistence

```ts
// Save
const snapshot = store.getStoreSnapshot('document');
localStorage.setItem('drawing', JSON.stringify(snapshot));

// Load
const snapshot = JSON.parse(localStorage.getItem('drawing'));
store.loadStoreSnapshot(snapshot); // Runs migrations automatically
```

### Sync Protocol (v8)

Client-server WebSocket protocol with optimistic concurrency:

**Client -> Server:**

| Message   | Purpose                                        |
| --------- | ---------------------------------------------- |
| `connect` | `{ lastServerClock, protocolVersion, schema }` |
| `push`    | `{ clientClock, diff?, presence? }`            |
| `ping`    | Keepalive                                      |

**Server -> Client:**

| Message       | Purpose                                                                |
| ------------- | ---------------------------------------------------------------------- |
| `connect`     | `{ hydrationType, diff, serverClock, schema, isReadonly }`             |
| `patch`       | `{ diff: NetworkDiff, serverClock }`                                   |
| `push_result` | `{ clientClock, action: 'commit' \| 'discard' \| { rebaseWithDiff } }` |
| `data`        | Batched `patch` + `push_result` messages                               |

**NetworkDiff** is a compact wire format:

```ts
type NetworkDiff = {
  [id: string]: ['put', record] | ['patch', ObjectDiff] | ['remove'];
};
```

**Client architecture** (`TLSyncClient`):

- Listens to store with `{ source: 'user', scope: 'document' }`.
- Maintains `speculativeChanges` (optimistic local state).
- On reconnect: undoes speculative changes, applies server state, rebases.
- FPS-throttled: 1 FPS solo, 30 FPS collaborative.
- Health check via ping every 5s, timeout at 10s.

**Server architecture** (`TLSyncRoom`):

- Manages sessions with states: `AwaitingConnectMessage`, `Connected`, `AwaitingRemoval`.
- Uses pluggable `TLSyncStorage` for persistence.
- Push results: `'commit'` (accepted), `'discard'` (rejected), or `{ rebaseWithDiff }` (accepted with modifications).
- Debounces data messages at 60fps to clients.

### TLSyncStorage Interface

```ts
interface TLSyncStorage<R> {
  transaction<T>(callback: (txn) => T): TLSyncStorageTransactionResult<T, R>;
  getClock(): number;
  onChange(callback): () => void;
}
```

Built-in implementations: `InMemorySyncStorage`, `NodeSqliteSyncWrapper`, `DurableObjectSqliteSyncWrapper`.

### External Store Integration

Key integration seams for custom backends (like ECHO/Automerge):

```ts
// 1. Capture local changes
store.listen(
  (entry) => { /* push entry.changes to backend */ },
  { source: 'user', scope: 'document' }
);

// 2. Apply remote changes (tagged as 'remote', won't echo back to listener above)
store.mergeRemoteChanges(() => {
  store.put(remoteRecords);
  store.remove(remoteIds);
});

// 3. Apply diffs directly
store.applyDiff(diff, { ignoreEphemeralKeys: true });

// 4. Extract changes without triggering listeners
const diff = store.extractingChanges(() => {
  store.put([...]);
});
```

---

## 13. Migration System

Versioned, sequenced migrations with topological ordering:

```ts
const versions = createShapePropsMigrationIds('my-shape', {
  AddColor: 1,
  AddLabel: 2,
});

const migrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: versions.AddColor,
      up: (props) => {
        props.color = 'black';
      },
      down: (props) => {
        delete props.color;
      },
    },
    {
      id: versions.AddLabel,
      up: (props) => {
        props.label = '';
      },
      down: 'retired', // No longer supported
    },
  ],
});
```

**Migration scopes:** `'record'` (individual records), `'store'` (entire serialized store), `'storage'` (direct storage access).

**Version tracking:** `SerializedSchemaV2` stores `{ schemaVersion, sequences: { [id]: lastVersion } }`. On load, `schema.getMigrationsSince()` computes needed migrations.

**Cross-sequence ordering:** `dependsOn` property enables topological sort of migrations across sequences.

---

## 14. Asset Handling

```ts
interface TLAssetStore {
  upload(asset, file): Promise<{ src: string }>;
  resolve(asset, context): Promise<string>;
}
```

Without a custom `TLAssetStore`, assets are stored inline as base64. Asset records are `document`-scoped and synced like any other record; the actual file data is stored externally.

---

## 15. DXOS Integration

### Architecture Overview

plugin-sketch bridges ECHO (Automerge CRDT) and tldraw's `TLStore` via a three-layer adapter:

```
ECHO Document (Automerge)
    |
    v
AbstractAutomergeStoreAdapter    (generic, framework-agnostic)
    |
    v
TLDrawStoreAdapter               (tldraw-specific)
    |
    v
TLStore                          (tldraw's reactive store)
    |
    v
<Tldraw store={...} />           (React component)
```

### Layer 1: AbstractAutomergeStoreAdapter

Generic base class that:

1. Opens with a `DocAccessor<any>` pointing to a path in an Automerge document (e.g., `['content']` of a Canvas object).
2. Initializes by comparing Automerge doc with component store. Seeds from store defaults if empty; otherwise pushes decoded records to the component store.
3. Subscribes to ECHO `'change'` events. Computes Automerge diffs between `_lastHeads` and `currentHeads`, filters patches by path via `rebasePath()`, classifies as updates or deletes.
4. Writes back via `accessor.handle.change()` -- added/updated records are `encode()`-d; deleted records are removed.

### Layer 2: TLDrawStoreAdapter

Concrete subclass bridging to tldraw:

- **`onOpen(ctx)`**: Creates a fresh `TLStore` via `createTLStore({ shapeUtils: defaultShapeUtils })`. Subscribes to store for `scope: 'document', source: 'user'` changes, accumulating into a `Modified<TLRecord>` tracker.
- **`onUpdate(batch)`**: Uses `transact()` to atomically `put` and `remove` records.
- **`save()`**: Flushes accumulated changes to ECHO. Called on `pointer_up` events -- not automatic.

### Layer 3: useStoreAdapter Hook

React hook managing adapter lifecycle:

1. Creates singleton `TLDrawStoreAdapter`.
2. Loads canvas ref from Sketch object, validates schema is `'tldraw.com/2'`.
3. Creates `DocAccessor` at `['content']`, calls `adapter.open(accessor)`.
4. Cleans up via `adapter.close()` on unmount.

### Encode/Decode

- **`encode(value)`**: Deep-clones objects. Strings > 300,000 chars wrapped in `A.RawString` to disable character-level CRDT (performance optimization for large SVG data).
- **`decode(value)`**: Reverses encoding -- `A.RawString` back to plain strings.
- **`rebasePath(path, base)`**: Filters Automerge patches to accessor's sub-path.

### ECHO Schema

```ts
// Canvas: org.dxos.type.canvas v0.1.0
{
  schema?: string;                    // 'tldraw.com/2'
  content: Record<string, any>;       // Flat map of tldraw records by ID
}

// Sketch: org.dxos.type.sketch v0.1.0
{
  name?: string;
  canvas: Ref<Canvas>;               // Lazy-loaded reference
}
```

### Custom UI Components

| Component          | Description                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `MeshGrid`         | SVG crosshatch grid with multi-level zoom steps. Uses `React.useId()` for unique pattern IDs. |
| `DottedGrid`       | SVG dotted grid, same zoom steps.                                                             |
| `CustomMenu`       | Wraps `DefaultQuickActions`, adds "Snap" action.                                              |
| `CustomStylePanel` | Wraps `DefaultStylePanelContent`.                                                             |
| `CustomToolbar`    | Lists standard toolbar items, splices in thread (comment) tool at position 8.                 |

### Tldraw Configuration

```tsx
<Tldraw
  store={adapter.store}
  inferDarkMode={true}
  maxAssetSize={1_000_000}           // 1MB
  components={{
    DebugPanel: null,
    Grid: settings.grid === 'mesh' ? MeshGrid : DottedGrid,
    HelpMenu: null,
    MenuPanel: CustomMenu,
    NavigationPanel: null,
    StylePanel: CustomStylePanel,
    TopPanel: null,
    ZoomMenu: null,
    Toolbar: /* wraps DefaultToolbar with thread tool */,
  }}
  overrides={{
    actions: /* adds snap action with 's' shortcut */,
    tools: /* adds thread/comment tool */,
  }}
/>
```

### Known Pain Points & TODOs

1. **Manual save on `pointer_up`**: Changes flush to ECHO only on pointer release. Mid-draw crashes lose work.
2. **Grid ID collision**: tldraw bug where multiple grid instances share SVG pattern IDs. Workaround: `React.useId()`.
3. **Schema reconciliation**: Canvas `schema` field distinguishes tldraw vs. Excalidraw but `isSketch` ignores it.
4. **Image upload to WNFS**: TODO -- images currently embedded inline.
5. **Style panel not pluggable**: Fonts/colors/styles not customizable.
6. **Hardcoded tldraw schema versions**: `hooks/schema.ts` contains hardcoded version maps. Requires manual update on tldraw upgrades.
7. **Thread tool translation**: TODO -- "Comment" label not using i18n.
8. **Toolbar/graph integration**: TODO -- tldraw toolbar actions don't integrate with DXOS graph system.

---

## 16. Critique & Suggestions

### What tldraw Does Well

1. **Clean separation of concerns.** The layered architecture (state -> store -> editor -> UI) makes it possible to use pieces independently. The custom signals library avoids React-specific assumptions in the core.

2. **Extension model.** Shapes, tools, bindings, and UI components are all injected via props. `ShapeUtil.configure()` allows customization without subclassing. This is significantly better than most canvas libraries.

3. **Fine-grained reactivity.** Per-record atoms in the store mean React components only re-render when their specific data changes. Shape culling uses a single reactor instead of per-shape subscriptions.

4. **Comprehensive state machine.** The hierarchical `StateNode` system is well-designed for complex input handling. Dotted-path transitions, event bubbling, and tool locking cover real-world interaction patterns.

5. **Sync protocol design.** The optimistic concurrency with speculative changes and rebase is production-grade. The `NetworkDiff` format is compact.

### What Could Be Improved

#### Architecture

1. **Editor class is too large.** At 11,400 lines, `Editor.ts` is a god object. While it delegates to 13 managers, the public API surface is enormous. Consider splitting into focused facades (e.g., `editor.shapes.create()`, `editor.camera.zoomToFit()`, `editor.history.undo()`).

2. **Custom signals library adds maintenance burden.** The `@tldraw/state` package reimplements signals from scratch. While this avoids external dependencies, it means tldraw maintains its own reactivity system, React bindings, and debugging tools. Adopting an established signals library (e.g., `@preact/signals-core`) would reduce maintenance and benefit from community improvements.

3. **DOM-based rendering limits scale.** Rendering shapes as individually-positioned `<div>`s works well up to hundreds of shapes but struggles with thousands. A WebGL/Canvas2D renderer (like Excalidraw's) would handle larger drawings. The culling system mitigates this but doesn't eliminate the fundamental DOM overhead.

4. **Tight coupling between store and editor.** The `TLStore` is generic, but it's always instantiated with tldraw's specific `TLRecord` types. The record type system (`TLShapeId`, `TLPageId`, etc.) is baked into the schema package, making it hard to extend the data model without forking.

#### DXOS Integration

5. **Save-on-pointer-up is fragile.** The current pattern of accumulating changes and flushing on `pointer_up` means:
   - Keyboard-only operations (delete, undo/redo, paste) may not trigger saves.
   - App crashes mid-draw lose all pending changes.
   - There is no periodic auto-save fallback.

   **Suggestion:** Add a debounced auto-save (e.g., 500ms after last change) as a safety net alongside the pointer_up trigger. Consider using the store's `operationComplete` side effect hook.

6. **Full-document fallback on path mismatch.** When Automerge patches don't match the expected path (the `relativePath.length === 0` fallback in `base-adapter.ts`), the entire content map is marked as updated. This causes unnecessary full re-renders and could degrade performance on large sketches.

   **Suggestion:** Track which records actually changed by comparing the Automerge document state before and after, rather than falling back to a full update.

7. **Hardcoded tldraw schema versions are a maintenance trap.** The `hooks/schema.ts` file duplicates tldraw's internal schema versioning. Every tldraw upgrade requires manual synchronization.

   **Suggestion:** Import schema version information from tldraw's exports if possible, or generate the version map from tldraw's schema at build time.

8. **Missing bidirectional presence sync.** The adapter syncs document records but not presence records. Collaborator cursors, selections, and viewport indicators are handled by tldraw's session-scoped records, which are excluded from ECHO sync.

   **Suggestion:** Use ECHO's presence/awareness protocol to sync tldraw's `presence`-scoped records, enabling live cursor sharing.

9. **RawString threshold is arbitrary.** The 300,000-character threshold for disabling character-level CRDT is a magic number. It optimizes for embedded SVG data but could silently degrade collaboration on legitimate large text content.

   **Suggestion:** Make the threshold configurable. Consider using content-type heuristics (e.g., only apply to base64/SVG data) rather than a blanket size check.

#### API & Developer Experience

10. **UI override ergonomics are inconsistent.** Component overrides use `null` to disable but require full replacement otherwise. There is no composition pattern for extending default components (e.g., adding an item to the toolbar requires replacing the entire toolbar and re-implementing default content).

    **Suggestion:** Provide slot-based composition (e.g., `<DefaultToolbar before={...} after={...} />`) or a middleware pattern for incremental customization.

11. **Keyboard shortcut syntax is non-standard.** The `!$?` prefix syntax (`$z` for Cmd+Z, `!$z` for Cmd+Shift+Z) is tldraw-specific and not documented alongside the code. This creates a learning curve for developers writing custom actions.

    **Suggestion:** Document the syntax prominently or adopt a standard format like `mod+z`, `mod+shift+z`.

12. **No first-class plugin system.** Extensions require passing arrays of shape utils, tools, binding utils, overrides, and components as separate props. There is no single "plugin" abstraction that bundles related extensions.

    **Suggestion:** Define a `TldrawPlugin` interface that groups `shapeUtils`, `tools`, `bindingUtils`, `overrides`, and `components` into a single installable unit.

#### Performance

13. **Spatial index is not exposed for queries.** The `SpatialIndexManager` uses an R-tree for internal rendering decisions but doesn't expose it for plugin use (e.g., "find all shapes within this rectangle").

    **Suggestion:** Expose spatial queries as a public API on the editor.

14. **No incremental SVG export.** `toSvg()` re-renders the entire canvas every time. For large drawings, this is expensive.

    **Suggestion:** Cache per-shape SVG output and compose incrementally.

---

_Generated 2026-04-05. Based on tldraw v3.x (github.com/tldraw/tldraw) and DXOS plugin-sketch (@dxos/plugin-sketch v0.8.3)._
