---
'@dxos/client': patch
'@dxos/plugin-markdown': patch
---

Let a dev server start the agent debug port on a known session, and let plugins contribute
slash-menu commands to the markdown editor.

`DebugPortStartOptions` gains `session`, so a caller that already knows the id skips the
copy-the-id handshake. `MarkdownCapabilities.MenuExtension` is a new multi capability: an entry
names an Operation (not a callback), and contributions are grouped by the contributing plugin.
