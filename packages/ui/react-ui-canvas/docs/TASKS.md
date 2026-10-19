# Views, objects and tags — Tasks

Design: [VIEWS.md](./VIEWS.md). Each phase is one commit, typechecked, tested, and smoke-rendered in Storybook.

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

- [ ] `Tag { id, name, hidden?, locked? }` on the document; `tags?: TagId[]` on nodes, links and Object definitions.
- [ ] Hidden and locked are the union over an element's tags (rendering, hit testing, selection).
- [ ] Migrate `scene.layers` + `node.layer` to tags on load; fixture test comparing drawn output before and after.
- [ ] LayersInspector becomes the Tags panel; tag chips in Properties.

## Phase 4 — Order

- [ ] Drawing order is each container's child order; drop layer `z` from ordering.
- [ ] Migrate each container by sorting on (layer `z`, node `z`) once.
- [ ] Bring forward / Send back act on the container order.

## Phase 5 — Panels

Built on `@dxos/react-ui-list` Tree (VIEWS.md §6b).

- [ ] react-ui-list: `filterTreeModel(model, predicate)` (matches plus ancestors, ancestors open while filtering).
- [ ] react-ui-list: `Tree.Root` `reveal(path)` (open ancestors, focus and scroll the row, windowed or not).
- [ ] react-ui-list: shift-click range selection reported in `TreeSelectEvent`.
- [ ] `ViewTreeModel`: a `TreeModel` derived from the store atoms (Views → nodes and links → Instances → Object contents).

- [ ] Views panel: the hierarchy under the root (Views → nodes and links → Instances → their Object's contents), with counts on rows.
- [ ] Views panel: selecting a row selects on the canvas; a View row opens it by the drill path; a filter by name, type or tag.
- [ ] Views panel: drag rows to restack within a container.
- [ ] Objects panel: the library (open in isolation, place, duplicate, rename, delete); anonymous Objects hidden.
- [ ] Delete AboutInspector, its story and its Canvas part.

## Follow-ups

- [ ] Decide VIEWS.md §7 open questions (tag effects, link rows, merged View record, orphans, Views inside Objects).
