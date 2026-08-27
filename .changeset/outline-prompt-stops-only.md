---
'@dxos/plugin-assistant': patch
---

The chat outline rail lists one tick per prompt again. Tool results travel back as user-role messages carrying a synthetic text block, so filtering on the role alone added a tick per tool call and titled it from the raw `<result>` markup; the rail now uses the feed's `isPrompt` predicate and titles markers from authored text only.
