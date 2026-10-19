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
3. Phase 1 (View rename) across react-ui-canvas and plugin-canvas.
4. Phase 2 (groups are Objects).
5. Phase 3b (orphans).
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

- [ ] Rename the public types: `SceneId` → `ViewId`, `SceneStore` → `ViewStore`, `SceneKind` → `ViewKind`, `Canvas.Scenes` → `Canvas.Views`.
- [ ] Rename the `frame` node type to `view` (schema, registry, tool, palette key); read stored `frame` as `view` on load.
- [ ] Update every call site, plugin-canvas included; no compatibility re-exports.
- [ ] User-facing strings say "View" (tool, menus, tooltips, breadcrumbs).
- [ ] Rename stories and their titles; restart Storybook and smoke-render the touched stories.

## Phase 2 — Groups are objects

- [ ] Group writes an anonymous Object definition and one Instance in place of the selection (from `composeSelection`).
- [ ] Naming an anonymous Object, or placing it a second time, adds it to the library.
- [ ] Ungroup replaces an Instance of an anonymous Object with its contents and deletes the definition.
- [ ] Remove `groupIntoScene` and the Compose command.

## Phase 3 — Tags

- [ ] `Tag { id, name, hidden?, locked?, opacity? }` on the document; `tags?: TagId[]` on nodes, links and Object definitions.
- [ ] Hidden and locked are the union over an element's tags (rendering, hit testing, selection); opacity multiplies.
- [ ] Migrate `scene.layers` + `node.layer` to tags on load; fixture test comparing drawn output before and after.
- [ ] LayersInspector becomes the Tags panel; tag chips in Properties.

## Phase 3b — Orphans

- [ ] Deleting the last node that points at a View or anonymous Object record deletes the record in the same intent; undo restores both.
- [ ] Clean up records already orphaned on load (fixtures and saved documents).

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
- [ ] Objects panel: the library (open in isolation, place, duplicate, rename, delete); anonymous Objects hidden.
- [ ] Delete AboutInspector, its story and its Canvas part.

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
