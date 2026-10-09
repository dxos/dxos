---
'@dxos/react-ui-canvas': minor
'@dxos/plugin-canvas': minor
'@dxos/react-ui-form': patch
---

The scene shape is now a frame. Breaking: the built-in node type `scene` is renamed `frame` (palette name "Frame", shortcut F), with `PortalNode` → `FrameNode`, `isPortalNode` → `isFrameNode` and `PortalNodeView` → `FrameNodeView`; the node's `scene` field (its child scene id) is unchanged, and drawings saved with `type: 'scene'` are not migrated. A node type may define `hostOpen`, the host's own way to open a node of it: opening (double-click, Enter, the open control) calls it instead of drilling in, and auto-drill passes such a node by. `OpenControl` is exported so a host's frame view can show the same control. Content marked `data-scene-overlay` inside a node takes the wheel only where it has something to scroll; elsewhere the canvas still pans.

In `@dxos/plugin-canvas`, a frame holds either its own nested scene or a referenced ECHO object: `CanvasSceneNode.drawing` is replaced by `CanvasFrameNode.object` (any object, picked in the properties panel) and `role` (`card`, `section` or `article`; unset is a card). A canvas drawing is embedded as a scene, as linked drawings were; any other object renders as its surface of that role, and opening the frame opens the object in the app. The object picker lists only user objects (those the navtree shows), not system objects such as space properties or canvases.

In `@dxos/react-ui-form`, the object picker's popup is as wide as its field rather than growing to its longest option.
