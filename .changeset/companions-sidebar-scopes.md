---
'@dxos/plugin-deck': minor
---

Companions now carry a scope — `node`, `workspace` or `global` — and the complementary sidebar shows every applicable one in a single rail, ordered most specific first with a separator between groups. Node companions resolve from the attended plank and re-resolve as attention moves; the selected panel is remembered as a preference, so attending something that lacks the chosen companion falls back to its first one without forgetting the choice. The sidebar is also resizable by dragging its inner edge, and the width persists. Contributing a root-level companion takes an optional `scope` (defaulting to `global`); workspace-scoped companions — search, the trace panel and the database panel — are offered only while a space is open.
