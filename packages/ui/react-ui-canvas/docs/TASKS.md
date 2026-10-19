# Views, objects and tags — Tasks

Design: [VIEWS.md](./VIEWS.md). Each phase is one commit, typechecked, tested, and smoke-rendered in Storybook.

## Order (agreed 2026-10-18)

1. Land PR #14030; then the held canvas changes (grid crossfade, text-node leading, Nested story) as their own PR.
2. ~~Barrels~~ Done 2026-10-18: `folder-barrel-imports` (PR #14048) is on for react-ui-canvas (`.oxlintrc.json` override, `src/headless.ts` allowed); its 30 violations fixed; the barrel half of `layers.test.ts` removed.
3. Phase 0 below: refactor `CanvasRoot` and its context.
4. Phases 1-6.

## Overnight plan (agreed 2026-10-19; all in PR #14050, unlanded)

1. Finish Phase 0: Navigation and Look in the controller; aspect hooks and the Time/Gesture/Editing providers; Viewport split (Background, Scene, Overlay); Canvas hooks to `hooks/canvas/`; `CanvasRoot.tsx` under ~600 lines; re-render test extended to selection.
2. ~~`Canvas.Views`~~ Done 2026-10-19: the Views inspector in the canvas — rows select, Open drills in, drag restacks through the projection, the canvas selection reveals its row.
3. ~~Phase 1 (View rename) across react-ui-canvas and plugin-canvas.~~ Done 2026-10-19.
4. ~~Phase 2 (groups are Objects).~~ Done 2026-10-19.
5. ~~Phase 3b (orphans).~~ Done 2026-10-19.
   In parallel, as chips: react-ui-list Tree filter/reveal/range selection; tldraw import (plugin-canvas backlog).
   Not attempted: Phases 3 and 4 (saved-data changes), Phase 6 (needs #14047 reviewed).

## Phase 0 — Canvas core refactor

Design: DESIGN.md §13.

- [x] Inventory every `CanvasContextValue` field: kind, source, change rate, readers.
- [x] Design: services context, parts read atoms, a React-free `CanvasController`, derived state with its reader.
- [x] 0.1 Prune: dead fields, `createAtCentre` camera read, unused memo deps, inventory inconsistencies. (`keyCamera` removed: no caller; returns with the Time aspect. Timeline's explicit `onPlayingChange`/`onAutoKeyChange` writes kept for 0.3.)
- [x] 0.2 Viewport reads its own atom-state and computes its own derived values (hover, point, latticeBounds, focus, frameUnit; `viewport` added to the context). `createFrame`, `handlers` and `themeGrid` move with their aspects in 0.3.
- [x] 0.3 Aspects (DESIGN.md §13.1): services provider, aspect hooks, Time/Gesture/Editing providers, `displayScene` atom; story test that panels do not re-render on a pan.
  - [x] Camera out of the context; `Renders.stories.tsx` › Test: 0 panel commits across a 20-step pan (was 20 each).
  - [x] The aspect hooks and providers — after 0.4, which supplies their commands (order swapped 2026-10-18: the hooks are plumbing until the controller exists). `CanvasServices` plus `useCanvasDocument/Navigation/Selection/Tools`, and Look, Time, Editing and Gesture providers; each toolbar builds its own `ToolbarActions` slice; `Renders` › Test also asserts that a selection re-renders none of Navigation, Theme, Tools, About.
    - Decisions: Look rides its own provider, as its values are host props; `displayScene` (with `bounds`, `viewport`, `navigating`) rides the Gesture provider rather than a derived atom, as it depends on React-side gesture state, and Objects reads the stored scene, which names the same instance; `generated` rides the Time provider; fit mode is a per-mount atom; `InspectorSection` subscribes to its own slot, so the panel's selection flag re-renders only the sections it shows or hides.
- [x] 0.4 `createCanvasController` in `engine/`, organised by aspect, unit-tested per aspect; callers use it.
  - [x] Selection (select, clear, delete, group, classFrom) and Editing (copy, cut, paste); `useSceneClipboard` removed; `createId` moved to `utils/`.
  - [x] Tools (setTool, grid toggles) and Time (seek, play, step, jump, add/remove key, auto-key); the controller is in the context.
  - [x] Navigation and Look. Layers and Objects wait for Phases 3 and 2, which replace them. Navigation: drill in/out, back, history, breadcrumbs, isolation, fit, fit selection, zoom; the kept entry frames live in the controller; the view's animation and fit mode come in as `CameraMotion` and `ViewFit`. Look: the theme and grid pickers call the host's handlers.
- [x] 0.5 Split Viewport (Background, Scene, Overlay) and the parts into their own files.
  - [x] Parts into files: `Canvas.tsx` (namespace, 37 lines), `CanvasRoot.tsx`, `CanvasViewport.tsx`, `CanvasBars.tsx`, `CanvasInspectors.tsx`, `constants.ts`.
  - [x] Viewport into Background, Scene and Overlay; `CanvasRoot.tsx` under ~600 lines (needs the rest of 0.4). `ViewportBackground/Scene/Overlay.tsx`; `CanvasRoot.tsx` 1,477 → 540 lines, its props in `CanvasRootProps.ts`.
  - [x] Move the Canvas hooks to `hooks/canvas/` once 0.4 settles them (needs `handlePoint` and the tool catalogue behind `toolForKey` in `utils/`). Plus the hooks split out of the root (`useSceneView`, `useCanvasController`, `useGesturePreview`, `useElementHandlers`, `useObjectActions`, `useDocumentCommands`, ...); `ElementHandlers`, `TimelineKeys`, `SceneDisplay` moved with them.

## Phase 1 — View

- [x] Rename the public types: `SceneId` → `ViewId`, `SceneStore` → `ViewStore`, `SceneKind` → `ViewKind`, `Canvas.Scenes` → `Canvas.Views`.
  - Also: `Scene` → `View` (type and schema), `SceneMap` → `ViewMap`, `MemorySceneStore` → `MemoryViewStore`, `OpenScene` → `OpenView`, `createSceneSchema` → `createViewSchema`, `updateScene`/`putScene` → `updateView`/`putView`, the store's `scenes`/`scene(id)` → `views`/`view(id)`, `SceneBuilder`/`SceneElement`/`SceneTree` → `ViewBuilder`/`ViewElement`/`ViewTree` (`.scene()` → `.view()`, `tree.scenes` → `tree.views`), `useSceneProjection` → `useViewProjection`, and the View-sense helpers (`sceneOptions`, `SceneField`, `groupIntoScene`, `compositeScenes`, `recordScenes`, `instanceScene`, `layoutScene`, `sceneLayers`, `visibleScene`, `sampleScene`, `sceneLinkGeometry`, `createSceneTree`, `createModelSceneTree`; `createFrameTree` → `createNestedViewTree`).
  - Decisions: there was no `Canvas.Scenes` part (`Canvas.Views` is the Views inspector), so nothing clashed. `ViewKind` is `'view' | 'composite'`; plugin-canvas never stored `'scene'` (it omits the plain kind). Names where _scene_ means the drawn world or the render layer keep it: `SceneLayer`, `ViewportScene`, `SceneView`/`useSceneView`, `SceneCamera`, `SceneNavigation`, `SceneSnap`, `useSceneKeys`, `useSceneWheel`, `SceneDisplay`, `SceneLook`, `SceneViewAtoms`, `screenToScene`/`sceneToScreen`, `SCENE_OVERLAY_ATTRIBUTE`, the playwright `SceneManager`, and the `scene-view` test ids. `FrameHeader` (an animation's sequence of scenes) and the camera-framing helpers (`fitFrame`, `childFrame`, `portalFrame`, `frameClasses`) keep _frame_. Local variables and prose comments still say _scene_; renaming them would double the diff without changing the API.
  - The stored shape is unchanged: plugin-canvas keeps `SceneRecord`, the `scene:<id>` keys, `kind: 'scene'` records, the records' `scene` field, `sceneKind`, `SCENE_SCHEMA`, and a view node's `scene` field (its child View).
- [x] Rename the `frame` node type to `view` (schema, registry, tool, palette key); read stored `frame` as `view` on load.
  - `FrameNode` → `ViewNode`, `isFrameNode` → `isViewNode`, `FrameLink`/`frameLinkFields` → `ViewLink`/`viewLinkFields`, `FrameNodeView` → `ViewNodeView`; the style set's `frame` part → `view` (`FRAME_FILLS` → `VIEW_FILLS`); palette name "View", key `F` kept. `withLegacyNodeType`/`withLegacyView` (model) map `frame` to `view`: the memory store applies them to its initial Views, plugin-canvas to every node record it reads (`readViews`, `migrateContent`, the linked-drawing write path). Tests: `model/store.test.ts`, plugin-canvas `content.test.ts`. New Views made from a selection get `view-` ids.
- [x] Update every call site, plugin-canvas included; no compatibility re-exports.
  - plugin-canvas (`CanvasFrameNode*` → `CanvasViewNode*`, `CanvasFrameToolbar` → `CanvasViewToolbar`, `FrameRole` → `ViewRole`, `frame-node.ts` → `view-node.ts`, `readScenes`/`writeScenes` → `readViews`/`writeViews`, `ROOT_SCENE_ID` → `ROOT_VIEW_ID`, `parseLinkedSceneId`/`linkedSceneId` → `…ViewId`), react-ui-canvas-compute (`boardSceneId` → `boardViewId`, `sceneFromCircuit`/`sceneFromLayout`/`applySceneToLayout` → `view…`/`applyViewToLayout`), plugin-conductor and plugin-uml. plugin-debug only reaches the canvas through react-ui-canvas-compute's presets, which did not change.
- [x] User-facing strings say "View" (tool, menus, tooltips, breadcrumbs).
  - "New view from selection", "Open view", the About count "Views", the properties field "View", the Live depth setting, and the plugin-canvas autocue flows' labels and `view` node selectors. Kept: plugin-canvas operation and skill descriptions (memoized LLM fixtures key on them).
- [x] Rename stories and their titles; restart Storybook and smoke-render the touched stories.
  - `Canvas` › `Frame` → `View` (fixture `frame` → `view`, `scenes` → `deep`), `PropertiesInspector` › `Frame`/`FrameTest` → `ViewNode`/`ViewNodeTest` (`View` clashes with the imported type), plugin-canvas `CanvasArticle` › `ObjectFrame` → `ObjectView`. No title named a scene or frame. Smoke-rendered through the storybook test project (20 files, 59 tests); the shared server was not restarted.

## Phase 2 — Groups are objects

- [x] Group writes an anonymous Object definition and one Instance in place of the selection (from `composeSelection`).
  - `controller.selection.group` (⌘G, the inspector's Group button, the element menu's Group): `View.anonymous` (and `SceneRecord.anonymous` in plugin-canvas) marks the definition, named `Group N`; one undo step via `recordViews`.
- [x] Naming an anonymous Object, or placing it a second time, adds it to the library.
  - `promoted` clears the mark on rename (`objectActions.rename`), on place from the library, on paste of a copied Instance while its Object exists, and on ⌘-drag duplicate (`controller.document.duplicate`). `libraryViews` leaves anonymous Objects out.
  - Decisions: the Objects panel lists the library plus the selected (or isolated) anonymous Object, in italics, so it can be named there; there is no Properties field for an Object's name, so naming happens in the Objects panel only. A copy (Duplicate object) is named. Make unique is disabled for an anonymous Object, which has one Instance already.
- [x] Ungroup replaces an Instance of an anonymous Object with its contents and deletes the definition.
  - `controller.selection.ungroup` (⇧⌘G, the inspector's Ungroup button, the element menu) explodes every selected Instance where it drew its contents, under fresh ids; a named Object's definition stays. The anonymous definition goes through the orphan rule below, in the same undo step. Keyed tracks moved into the Object by Group do not come back out (as before).
- [x] Remove `groupIntoScene` and the Compose command.
  - `groupIntoView` (`utils/group.ts`), `objectActions.compose`/`ungroup`, the Objects panel's `objects-compose` button and `onCompose`, and the element menu's "Group as object" are gone; "New view from selection" is now Group. `Animation` › Test groups with ⌘G; `Canvas` › Group is the Group/Ungroup play test.

## Phase 3 — Tags

- [ ] `Tag { id, name, hidden?, locked?, opacity? }` on the document; `tags?: TagId[]` on nodes, links and Object definitions.
- [ ] Hidden and locked are the union over an element's tags (rendering, hit testing, selection); opacity multiplies.
- [ ] Migrate `scene.layers` + `node.layer` to tags on load; fixture test comparing drawn output before and after.
- [ ] LayersInspector becomes the Tags panel; tag chips in Properties.

## Phase 3b — Orphans

- [x] Deleting the last node that points at a View or anonymous Object record deletes the record in the same intent; undo restores both.
  - `model/orphans.ts`: a record is kept when reachable from the root, a store-declared root (`ViewStore.isRoot`, plugin-canvas's linked drawings' roots) or a named Object; `pruneOrphaned` deletes only what an edit orphaned. The controller's delete, cut, paste, group, ungroup and duplicate apply through one helper that prunes and records the store change with the intent.
  - Decisions: a cut deletes the records with the nodes, and the clipboard keeps a copy of the records its nodes open (`Clipboard.views`), so the paste after a cut restores them (an anonymous Object stays anonymous: it is a move); a second paste is a second placement. Deletes outside the controller (Objects panel "Delete object and its instances", host operations) are not pruned at once; the load clean-up catches them.
- [x] Clean up records already orphaned on load (fixtures and saved documents).
  - `createMemoryStore(views, styles, { root })` drops them when given the root (the Canvas and Animation stories pass it); plugin-canvas's `bindCanvasStore` prunes the drawing's content on bind (`orphanedViews`/`pruneOrphanedViews`). Tests: `model/store.test.ts`, plugin-canvas `content.test.ts` and `store.test.ts`.

## Phase 4 — Order

- [ ] Drawing order is each container's child order; drop layer `z` from ordering.
- [ ] Migrate each container by sorting on (layer `z`, node `z`) once.
- [ ] Bring forward / Send back act on the container order.

## Phase 5 — Panels

Built on `@dxos/react-ui-list` Tree (VIEWS.md §6b).

- [x] react-ui-list: `filterTreeModel(model, predicate)` (matches plus ancestors, ancestors open while filtering).
- [x] react-ui-list: `Tree.Root` `reveal(path)` (open ancestors, focus and scroll the row, windowed or not).
- [x] react-ui-list: shift-click range selection reported in `TreeSelectEvent`.
- [ ] `ViewTreeModel`: a `TreeModel` derived from the store atoms (Views → nodes and links → Instances → Object contents); links listed under their container.
  - [x] First cut (2026-10-18): `utils/view-tree.ts` `buildViewTree` (tested) behind a static tree model in `ViewsInspector`, with stories over the shared fixtures (`src/testing/`); select reports the row, View rows open by path.
  - [x] Wired into `Canvas` as `Canvas.Views` (2026-10-19); still a static model rebuilt from `store.scenes`, not per-node atoms.

- [x] Views panel: the hierarchy under the root (Views → nodes and links → Instances → their Object's contents), with counts on rows. `Canvas.Views` (a dock-only section) over `store.scenes`; the tree model is rebuilt per edit, its open state kept by row path.
- [x] Views panel: selecting a row selects on the canvas; a View row opens it by the drill path; a filter by name, type or tag. Rows select through `navigation.openView(path, { select })` (meta toggles, shift takes the range in the row's View); the canvas selection marks its rows and reveals the first without taking focus; Open, Enter or a double-click opens a View row; the filter matches label or type (tags wait for Phase 3).
- [x] Views panel: drag rows to restack within a container. `controller.document.restack` → one `reorder` intent through the open View's projection; `canRestack`/`viewReorder` unit-tested.
  - Decisions (2026-10-19): the restack is the existing `reorder` intent rather than `update` with a `z`, as `reorder` is exactly that edit; a drop is accepted only among siblings in the open View, since the projection is the open View's (restacking another View would need its own projection or navigating there mid-drag); a View row's click selects its frame in the parent View, and only Open/Enter/double-click drill in; row selection navigates without animation so the selection lands in the View it names; `restackZ` now reports a move that changes nothing as undefined.
- [ ] Objects panel: the library (open in isolation, place, duplicate, rename, delete); anonymous Objects hidden. (Hidden since Phase 2, but for the selected one.)
- [x] Delete AboutInspector, its story and its Canvas part. (`Canvas.About` removed; the Views rows carry the counts.)

## Phase 6 — Undo (VIEWS.md §8)

- [ ] app-framework `HistoryTracker`: redo (future stack), scoped `undo/redo/canUndo(scope)`, transactions, merge keys, entry context.
- [ ] A versioned-store interface (`heads()`, `read(path, heads)`, `write`) over the memory store (snapshot refs) and ECHO (Automerge heads).
- [ ] `CanvasOperation.Apply` (intents → heads before/after and written paths) and `CanvasOperation.Patch`, with their `UndoMapping`.
- [ ] Route canvas gestures and panel edits through `Apply`; projections emit patches, not snapshots.
- [ ] Undo restores the View path and selection; Cmd+Z / Shift+Cmd+Z in a focused canvas use its scope.
- [ ] Remove `utils/undo.ts` and the `undo` atom.

## Follow-ups

- [ ] Decide VIEWS.md §7 open questions (tag effects, link rows, merged View record, orphans, Views inside Objects).
- [ ] Rotation: ports and link ends turn with the node (`portPoint`, route side normals, the pointer machine's port picks); the selection frame and its handles turn too; marquee and content bounds use the rotated frame.
- [ ] Docked inspectors: the bottom-left (navigation) and bottom-centre (actions) bars overlap when the canvas is narrow (seen in `Canvas › Docked` with the dock open).
- [ ] Ungroup brings the Object's animation tracks back out (Group moves them in; Ungroup drops them).
- [ ] The Objects panel's "Delete object and its instances" and host operations clean up orphans in the same intent, not on the next load.
