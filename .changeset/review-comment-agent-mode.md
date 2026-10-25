---
'@dxos/plugin-review': minor
---

The "Comment agent mode" setting (`off` | `auto` | `mention`, default `mention`) moves from plugin-markdown to plugin-review and applies to new comment threads on every subject, not only Markdown documents; Review's settings now appear under Plugin Settings. `Markdown.Settings` no longer has `commentAgentMode`; read `Settings.commentAgentMode` from plugin-review instead. The plugin registry's search filter also matches a plugin's description, as well as its key and name.
