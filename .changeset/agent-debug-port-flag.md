---
# multiple-changesets: a first-run schema-ordering fix (merged from another branch, different
# packages entirely) is unrelated to the debug-port flag — a reader hits one or the other, never both
'@dxos/client': patch
'@dxos/plugin-markdown': patch
'@dxos/app-toolkit': patch
---

Let a dev server start the agent debug port on a known session, and let plugins contribute
slash-menu commands to the markdown editor.

`DebugPortStartOptions` gains `session`, so a caller that already knows the id skips the
copy-the-id handshake. `MarkdownCapabilities.MenuExtension` is a new multi capability: an entry
names an Operation (not a callback), and contributions are grouped by the contributing plugin.

Also renames the settings-panel operation's key to `org.dxos.operation.appToolkit.openSettings`.
It collided with `LayoutOperation.Open`, so neither could be resolved by key alone.
