---
'@dxos/react-ui-canvas': minor
'@dxos/react-ui-canvas-compute': minor
'@dxos/plugin-canvas': minor
---

Breaking: the scene container is renamed View across the API — `SceneId` → `ViewId`, `SceneStore` → `ViewStore`, `SceneKind` → `ViewKind`, `Scene` → `View`, `SceneBuilder` → `ViewBuilder`, `useSceneProjection` → `useViewProjection`, the store's `scenes`/`scene(id)` → `views`/`view(id)` — and the `frame` node type is now `view` (`FrameNode` → `ViewNode`, `isFrameNode` → `isViewNode`); stored `frame` nodes load as `view`. react-ui-canvas-compute and plugin-canvas follow (`boardSceneId` → `boardViewId`, `readScenes`/`writeScenes` → `readViews`/`writeViews`, `ROOT_SCENE_ID` → `ROOT_VIEW_ID`, `DYNAMIC_SCENE_ID` → `DYNAMIC_VIEW_ID`).

The canvas's commands live in a React-free `CanvasController` (`createCanvasController`), organised by aspect (selection, editing, tools, time, navigation, look), and its parts read their own state, so panning or a selection change no longer re-renders panels that do not show it. A read-only canvas pastes, cuts and deletes nothing.

The new `Canvas.Views` panel shows the drawing's Views, nodes, links and placed Objects as a tree: a row selects on the canvas (opening an Object in isolation for its contents), the root row selects everything, a double-click opens a View, a drag restacks siblings, and a filter narrows the rows. Group (⌘G) makes an anonymous Object and one Instance in place of the selection, which joins the Objects library once named or placed again; Ungroup (⇧⌘G) puts it back. `groupIntoView` and the Compose button are removed, and deleting the last node that opens a View or an anonymous Object deletes that record, as stores do on load (`createMemoryStore`'s `root` option, plugin-canvas on bind).

The inspector panel shows the same sections docked or floating, Properties above a draggable seam and the rest below (`InspectorSectionDef.pane`; `InspectorSectionDef.show` and `InspectorPanel.Root`'s `selected` are removed); selection actions sit in its toolbar (`InspectorPanel.Root` `actions`). New shapes: `cloud` (key C, with a bump count) and a regular `polygon` (key N, with a side count), drawn through `NodeDef.silhouette`; every node takes a `rotation` in 15° steps. The timeline's key actions move into one menu, and the scene-tree fixtures move from `builder/testing` to `testing`.
