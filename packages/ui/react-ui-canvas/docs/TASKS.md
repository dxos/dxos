# Views, objects and tags — Tasks

Design: [VIEWS.md](./VIEWS.md). Each phase is one commit, typechecked, tested, and smoke-rendered in Storybook.

## Order (agreed 2026-10-18)

1. Land PR #14030; then the held canvas changes (grid crossfade, text-node leading, Nested story) as their own PR.
2. ~~Barrels~~ Done 2026-10-18: `folder-barrel-imports` (PR #14048) is on for react-ui-canvas (`.oxlintrc.json` override, `src/headless.ts` allowed); its 30 violations fixed; the barrel half of `layers.test.ts` removed.
3. Phase 0 below: refactor `CanvasRoot` and its context.
4. Phases 1-6.

## Phase 0 — Canvas core refactor

Design: DESIGN.md §13.

- [x] Inventory every `CanvasContextValue` field: kind, source, change rate, readers.
- [x] Design: services context, parts read atoms, a React-free `CanvasController`, derived state with its reader.
- [x] 0.1 Prune: dead fields, `createAtCentre` camera read, unused memo deps, inventory inconsistencies. (`keyCamera` removed: no caller; returns with the Time aspect. Timeline's explicit `onPlayingChange`/`onAutoKeyChange` writes kept for 0.3.)
- [x] 0.2 Viewport reads its own atom-state and computes its own derived values (hover, point, latticeBounds, focus, frameUnit; `viewport` added to the context). `createFrame`, `handlers` and `themeGrid` move with their aspects in 0.3.
- [ ] 0.3 Aspects (DESIGN.md §13.1): services provider, aspect hooks, Time/Gesture/Editing providers, `displayScene` atom; story test that panels do not re-render on a pan.
  - [x] Camera out of the context; `Renders.stories.tsx` › Test: 0 panel commits across a 20-step pan (was 20 each).
  - [ ] The aspect hooks and providers — after 0.4, which supplies their commands (order swapped 2026-10-18: the hooks are plumbing until the controller exists).
- [ ] 0.4 `createCanvasController` in `engine/`, organised by aspect, unit-tested per aspect; callers use it.
  - [x] Selection (select, clear, delete, group, classFrom) and Editing (copy, cut, paste); `useSceneClipboard` removed; `createId` moved to `utils/`.
  - [ ] Navigation, Tools, Time, Look. Layers and Objects wait for Phases 3 and 2, which replace them.
- [ ] 0.5 Split Viewport (Background, Scene, Overlay) and the parts into their own files.

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

- [ ] react-ui-list: `filterTreeModel(model, predicate)` (matches plus ancestors, ancestors open while filtering).
- [ ] react-ui-list: `Tree.Root` `reveal(path)` (open ancestors, focus and scroll the row, windowed or not).
- [ ] react-ui-list: shift-click range selection reported in `TreeSelectEvent`.
- [ ] `ViewTreeModel`: a `TreeModel` derived from the store atoms (Views → nodes and links → Instances → Object contents); links listed under their container.
  - [x] First cut (2026-10-18): `utils/view-tree.ts` `buildViewTree` (tested) behind a static tree model in `ViewsInspector`, with stories over the shared fixtures (`src/testing/`); select reports the row, View rows open by path. Not yet wired into `Canvas`, no filter or reveal.

- [ ] Views panel: the hierarchy under the root (Views → nodes and links → Instances → their Object's contents), with counts on rows.
- [ ] Views panel: selecting a row selects on the canvas; a View row opens it by the drill path; a filter by name, type or tag.
- [ ] Views panel: drag rows to restack within a container.
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
