---
'@dxos/plugin-review': minor
---

The "Comment agent mode" setting (`off` | `auto` | `mention`, default `mention`) moves from plugin-markdown to plugin-review and applies to new comment threads on every subject, not only Markdown documents. `Markdown.Settings` no longer has `commentAgentMode`; read `Settings.commentAgentMode` from plugin-review instead.
