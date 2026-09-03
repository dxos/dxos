---
'@dxos/plugin-assistant': patch
---

The chat's activity line ("Assembling tools", "Contacting inference provider", …) now sits above the counters pill rather than below it, so the sentence reads as a caption over the elapsed/token numbers. Both lines are composed by a new `Chat.StatusStack`.
