---
'@dxos/react-ui-canvas': minor
---

Panning the canvas no longer re-renders its panels and toolbars. The canvas's selection, editing and tool commands live in a `CanvasController` (`createCanvasController`) that reads its state when a command runs. A new `ViewsInspector` shows a drawing's views, nodes, links and placed objects as a tree. New scene from selection and New class from selection move to the inspector panel's toolbar (`InspectorPanel.Root` takes `actions`), a `cloud` node type (tool key C) joins the built-in shapes, drawn through a new `NodeDef.silhouette` outline, the timeline's key and auto-key actions move into one menu, and the scene-tree test fixtures move from `builder/testing` to `testing`. In react-ui-list, a Tree in multiple-selection mode opens its branches from the disclosure again, and `Tree.Content` takes `scroll={false}` to leave scrolling to an outer container.
