---
'@dxos/app-toolkit': patch
'@dxos/plugin-deck': patch
---

Deck companions in the complementary sidebar can set `mount` on their node: `always`, `selected` (the default, today's behaviour), or `open`. The trace panel stays mounted, and the Database panel unmounts while the sidebar is collapsed, which stops its query over the whole space.
