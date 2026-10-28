# Views, objects and tags — Design

Status: designed 2026-10-18; Phases 1, 2, 3b, 5 and 6 built, Phases 3 (tags) and 4 (order) not built. Ledger:
[TASKS.md](./TASKS.md). The model itself is specified in `SPEC.mdl` (Ontology, `type:View`, `type:Tag`, [F-4], [F-9]);
this document keeps the reasoning, the migration from the old terms and the undo design.

## 1. Goal

The canvas has grown four overlapping containers: a scene, the frame node that opens onto one, a composite object
and the instance that places it, and a layer. Users meet all of them in different panels under different names. This
design reduces them to three concepts, **View**, **Object** and **Tag**, with one rule for drawing order (the tree)
and two panels that show the whole hierarchy (Views and Objects). It frees the word _scene_ for animation.

## 2. Ontology

| Term          | Definition                                                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Canvas**    | The surface. It shows exactly one **root View** and navigates down from it; the navigation path always starts at the root.                                                                                                            |
| **Node**      | A positioned element: a centre, a size, a type (rect, ellipse, note, path, …) and style. Every node lives in exactly one container.                                                                                                   |
| **Link**      | A connection between two endpoints, each a node (and optional port) or a free point. A link lives in the container of its endpoints.                                                                                                  |
| **Container** | Anything that holds an ordered list of nodes and links: a View or an Object definition.                                                                                                                                               |
| **View**      | A node that contains other nodes and links with a **layout** (free, lattice, constrained, dynamic). A View can be zoomed into: drilling in makes it the canvas's current View. The root View is the one View no node contains.        |
| **Object**    | A reusable container definition: its nodes and links, drawn wherever it is placed. An Object is not zoomed into; it is opened in **isolation** to edit its definition, and every placement redraws.                                   |
| **Instance**  | A node that places an Object: the Object's contents scaled into the instance's box (`fit`), with per-instance `overrides`.                                                                                                            |
| **Group**     | What the Group command makes: an **anonymous Object** and one Instance of it in place of the selection. It is an Object in every respect but one: it is not in the Objects library until it is **named** or **placed a second time**. |
| **Tag**       | A label applied to any node, link, group or Object, many per element. A tag hides, locks or sets the opacity of everything it labels. It has no effect on drawing order. (Formerly _layer_.)                                          |
| **Order**     | A container's children are an ordered list; the canvas draws them in that order, first at the back. Moving an element in the Views tree restacks it.                                                                                  |
| **Scene**     | Reserved for animation (a timeline over a View). Not used for containers.                                                                                                                                                             |

```
Canvas ─ shows ─▶ root View
View    ─ contains (ordered) ─▶ Node | Link | View | Instance
Object  ─ contains (ordered) ─▶ Node | Link | Instance          (no View inside an Object)
Instance ─ places ─▶ Object
Tag     ─ labels ─▶ Node | Link | Instance | Object (many to many)
```

## 3. From the current model

| Today                                                   | Becomes                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `Scene` with `kind: 'scene'`, opened by a `frame` node  | A **View**: the frame node and the record it points at, presented as one thing.       |
| `frame` node type, the Frame tool                       | `view` node type, the View tool. Stored `type: 'frame'` reads as `view`.              |
| The canvas `root: SceneId`                              | The root View (`root: ViewId`).                                                       |
| `Scene` with `kind: 'composite'`                        | An **Object** definition.                                                             |
| `instance` node                                         | Unchanged: an **Instance**.                                                           |
| Group (`groupIntoScene`: selection → new frame)         | Removed. Group makes an anonymous Object (below).                                     |
| Compose (`composeSelection`: selection → composite)     | Folded into Group.                                                                    |
| `Layer { id, name, z, hidden }` per scene; `node.layer` | A **Tag** `{ id, name, hidden?, locked? }`; `element.tags: TagId[]`. No `z`.          |
| Drawing order: layer `z`, then node `z`                 | The container's child order. `z` keys stay as the order's storage (fractional index). |
| ObjectsInspector (flat list of composites)              | The **Objects** panel: the library.                                                   |
| LayersInspector                                         | The **Tags** panel.                                                                   |
| AboutInspector (counts)                                 | Deleted. Counts move onto tree rows.                                                  |

## 4. Decisions

1. **Two panels.** _Views_ shows the hierarchy under the root; _Objects_ is the library. An Object appears once in
   the library however many times it is placed.
2. **Rename to View in the UI and the public API**, not the stored shape: `SceneId` → `ViewId`, `Canvas.Scenes` →
   `Canvas.Views` (there was no such part; `Canvas.Views` is the Views panel), `frame` → `view`, `SceneKind` →
   `ViewKind`. A View stays a node pointing at a separate contents
   record, so persistence does not change; merging the record into the node is a later option (§7).
3. **The Views panel shows the full hierarchy**: Views, their nodes and links, and inside each Instance its Object's
   contents (read-only there; edit by opening the Object). Rows select on the canvas; a filter narrows the tree by
   name, type or tag. Selecting a View row opens it in the viewport by the drill path, so Up and Back still work.
4. **Group makes an anonymous Object**, promoted to the library when named or placed a second time. Compose is
   removed.
5. **Layers become Tags.** A tag hides, locks or sets opacity; drawing order belongs to the tree. The Tags panel manages them and
   the Views tree shows each element's tags as chips. The About counts move onto tree rows.

## 5. Model changes by phase

| Phase                 | Model                                                                                                                                                                                                                                                                                    | UI                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1. View               | Rename the public types and the `frame` node type; read `frame` as `view` on load.                                                                                                                                                                                                       | "View" everywhere; the View tool.                                                         |
| 2. Groups are Objects | Group writes an Object definition (`kind: 'composite'`) with `anonymous: true` and an Instance; naming or a second placement clears `anonymous`. Remove `groupIntoScene` and the Compose command.                                                                                        | Group and Ungroup on the selection; the library hides anonymous Objects.                  |
| 3. Tags               | `Tag { id, name, hidden?, locked?, opacity? }` on the document; `tags?: TagId[]` on nodes, links and Object definitions; migrate `scene.layers` + `node.layer` to tags. Hidden or locked is the union over an element's tags; opacity is the product of its tags' opacities and its own. | The Tags panel (from LayersInspector); tag chips in Properties and the tree.              |
| 4. Order              | Drawing order is the container's child order (`z` within the container); drop layer `z`. Migrate by sorting each container on (layer `z`, node `z`) once.                                                                                                                                | Drag rows in the Views tree to restack; Bring forward / Send back act on the order.       |
| 5. Panels             | None.                                                                                                                                                                                                                                                                                    | Views panel (tree, filter, select, open); Objects panel (library); delete AboutInspector. |

## 6. Risks

- **Phases 3 and 4 change saved documents.** Both need a load-time migration and a test over the existing fixtures
  and plugin-canvas samples (Flow, Template, Styles) that compares the drawn result before and after.
- **plugin-canvas consumes the renamed API** (`SceneId`, the `frame` type, `Canvas.*` parts, the layer field). Phase 1
  updates every call site in the same change; no compatibility re-exports.
- **Links across containers.** A link lives in its endpoints' container. Grouping a selection that cuts a link must
  keep today's rule (`composeSelection` exposes a port on the instance where the link meets it).
- **Tags that lock or hide an Object** apply to every placement of it; per-instance hiding is an override, not a tag.

## 6b. The tree: reuse `@dxos/react-ui-list` Tree

Reviewed 2026-10-18 (`packages/ui/react-ui-list/src/components/Tree`). **Verdict: reuse it.** It runs on Ark's
tree-view machine (zag), so keyboard navigation, `aria-level`/`aria-expanded`, typeahead and the roving tabindex come
for free; it windows large trees, drags rows with pragmatic-dnd, and is already used by navtree, debug, github and
sandbox. Building a canvas-specific tree would re-derive all of that.

How the Views panel maps onto it:

| Need                               | Tree provides                                                                                       | Fit                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Hierarchy over live store atoms    | `TreeModel`: five atom families (`item`, `childIds`, `itemProps`, `itemOpen`, `itemCurrent`)        | Good: the store is already Effect atoms, so a `ViewTreeModel` derives from `store.scenes` without copying. |
| One Object under several Instances | State keyed by path, not id, so the same contents under two Instances open and select independently | Good                                                                                                       |
| Canvas selection ↔ rows            | `selectionMode='multiple'`, `onSelect` with modifiers, `itemCurrent(path)`                          | Good: `itemCurrent` reads the canvas selection for rows in the open View.                                  |
| Restack by dragging                | `onDrop` (`TreeDropEvent`), `canDrop`, `getDropKind` (`move`/`link`/`reject`)                       | Good: `canDrop` keeps a drop inside its container; read-only Instance contents reject.                     |
| Counts, icons, row controls        | `itemProps.count`, `icon`/`iconHue`, `Tree.ItemActions` (hover-revealed trailing cells)             | Good: tag hide/lock toggles go in `ItemActions`.                                                           |
| Filter                             | Nothing                                                                                             | Gap                                                                                                        |
| Reveal a row from outside          | Internal only (`pendingFocusRef`, `scrollToNode` serve drops and keys)                              | Gap                                                                                                        |
| Shift-click range selection        | Passes `shift` through; computes no range                                                           | Gap                                                                                                        |
| Inline rename                      | Nothing (a consumer can render `Editable` in the row)                                               | Minor                                                                                                      |

Gaps, and where each fix belongs:

1. **Filter belongs in the model**, not the Tree: `childIds` returns only matches and their ancestors, and `itemOpen`
   reports matched ancestors open while a query is set. A shared `filterTreeModel(model, predicate)` wrapper in
   react-ui-list would serve navtree too.
2. **Reveal** needs a public API on `Tree.Root` (`reveal(path)`: open ancestors through the model, then focus and
   scroll the row, windowed or not). The machinery exists; it is not exposed. Add it in react-ui-list, not around it.
3. **Range selection** needs the visible row order, which only the Tree's walk has. Either the Tree computes the
   range and reports it in `TreeSelectEvent`, or it exposes the visible order. The first is simpler for every consumer.

## 8. Undo and redo

Designed 2026-10-18; decisions so far: one document-wide log per canvas (§8.3 Q1), patches computed by the change
itself, on Composer's history system rather than beside it (Q2).

### 8.1 Today

|                          | Canvas undo (`utils/undo.ts`)                                                                                                             | Composer `HistoryTracker` (app-framework `plugin-process-manager/history`)                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Records                  | A snapshot of the open View's projection model before each intent; for store steps (group, composite rename) the whole store's scenes too | Each operation invocation with an `UndoMapping`: the inverse operation and its input, derived from the forward operation's input and output |
| Scope                    | One log keyed by the open View: drilling into another View starts an empty log                                                            | One stack for the whole app                                                                                                                 |
| Redo                     | Yes                                                                                                                                       | No                                                                                                                                          |
| Under ECHO collaboration | Restoring a snapshot overwrites others' concurrent edits to that View                                                                     | Inverse operations: concurrent edits survive                                                                                                |

The precedent to follow is the tracker's: a forward operation returns the patch that reverses it (plugin-markdown's
`AcceptChange` returns its `undo` splice; `RestoreText` re-applies it). That is a patch computed by the change itself.

### 8.2 Evolving the tracker

| Need                            | Evolution                                                                                                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Redo                            | A future stack; redo re-invokes the forward operation with its recorded input. Recording anything new clears it.                                                                                                 |
| A log per canvas                | Each entry carries a **scope** (document or subject id). `undo(scope)` / `redo(scope)` / `canUndo(scope)` act on the latest entry in that scope; the unscoped calls and the toast keep working across the app.   |
| One entry per gesture           | **Transactions**: invocations inside `tracker.transaction(label, effect)` become one entry whose inverse runs their inverses in reverse order.                                                                   |
| Merging                         | A **merge key** (scope, element, field) and a window: an entry matching the previous one within it folds in, keeping the earliest inverse. Typing in a number field and nudging with arrow keys become one step. |
| Back to where it happened       | An optional **context** per entry (canvas: the View path and the selection before and after), restored before the inverse runs.                                                                                  |
| Canvas edits are not operations | Canvas intents become operations: `CanvasOperation.Apply { document, intents }` returns the inverse patch; its `UndoMapping` pairs it with `CanvasOperation.Patch`. Gestures, agents and MCP then share one log. |

The inverse patch is field-level over the store records the intents touched (Views, Objects, the tag table), so undo
writes only what the change wrote and concurrent edits to other fields survive. Projections (constrained, dynamic)
emit their changes as the same patches instead of model snapshots.

### 8.3 Questions

1. ~~Scope~~ Decided: one document-wide log per canvas; undo returns to the View it changed.
2. ~~Entry shape~~ Decided: patches computed by the change, on the evolved `HistoryTracker`.
3. ~~How gestures reach the tracker~~ Decided: every committed edit (pointer-up, panel edit, key command) is applied
   by the canvas in the frame it ends and recorded as `CanvasOperation.Patch` from its heads before to its heads
   after, a forward already done; agents and MCP invoke `CanvasOperation.Apply` with intents. Both share one log and
   one inverse (a `Patch` back). Revised 2026-10-20 from "every intent invokes `Apply`": the invoker is asynchronous,
   so the gesture's result would land a frame late, and controller commands write records (Group's Object, pruned
   orphans) that no intent expresses.
4. ~~Conflicts with later edits~~ Decided: field-level and best effort. Undo writes back only the fields the entry
   wrote and nobody has changed since; a field changed by someone else, or an element deleted since, is skipped and
   the toast says the undo was partial.

### 8.4 Lessons from Automerge

Automerge has no undo of its own, but its history makes one computable, and ECHO exposes it (`Obj.getVersion(obj,
heads)`, `Obj.getChanges(obj, { property })` with each change's actor).

1. **Entries hold heads, not values.** A transaction records each touched document's heads before and after, and the
   paths it wrote. Entries stay small and nothing is copied up front.
2. **Conflicts are read from history.** At undo, a path whose current value equals its value at the after-heads is
   untouched since: write its value at the before-heads. Otherwise someone changed it: skip it. This is §8.3 Q4
   with no stored values.
3. **Undoing a delete restores identity**: read the object at the before-heads and put it back under its key, so links
   and references to it hold.
4. **Only local changes are recorded**, by change actor (and the user's own agent, if attributed to them).
5. **Order stays in registers.** Automerge has no list move (a move is delete plus insert), which undoes badly; the
   fractional `z` keys are register values, so a restack undoes by restoring one value. Phase 4 keeps that.
6. **Text undoes by splice**, the plugin-markdown precedent, not by restoring the field.

Yjs's `UndoManager` (tracked origins, a capture timeout, per-item metadata for cursor restore) and Loro's built-in
undo (local only, merge interval, push/pop hooks) match §8.2's scope, merge and context. Stewen and Kleppmann (PaPoC 2024) define register undo and redo as writing the prior value as a new operation, which is point 2.

react-ui-canvas's in-memory store has no heads; immutable snapshot references stand in for them, behind one
versioned-store interface (`heads()`, `read(path, heads)`, `write(path, value)`) that the ECHO store also implements.

## 7. Open questions

1. ~~Tag effects beyond hide and lock~~ Decided 2026-10-18: tags also carry opacity (multiplied with the element's own).
2. ~~Links under their container or their source node~~ Decided 2026-10-18: under the container, since a link's
   source can change.
3. Merge a View's contents record into its node (one record per View)? It makes "a View is a node" literal but
   rewrites the store, navigation and persistence; deferred until the panels have settled the shape.
4. ~~Orphaned contents~~ Decided 2026-10-18: deleting the last node that points at a contents record (a View, or an
   anonymous Object's last Instance) deletes the record in the same intent, so undo restores both. There is no
   "Unplaced" group. A named Object with no Instances is a library entry, not an orphan.
5. ~~Can an Object contain a View?~~ Decided 2026-10-27: no, so an Object stays a drawing rather than a navigable place (SPEC.mdl [F-9.9]).
