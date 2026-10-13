---
'@dxos/echo-query': patch
---

`matchesFilter` now matches `#tag` terms for objects stored in a database. A stored tag is a local reference (`echo:///<id>`) while a tag map is keyed by the absolute uri, so the two never compared equal; tags are now compared by entity id, as the query engine does. The devtools Objects panel also fixes several issues: the edit history is read only while its pane is open (it replays every change), inline blob bytes show as `<N bytes>` instead of one row per byte, opened property rows survive edits, a blob referenced through a not-yet-loaded ref is previewed, and closing one occurrence of an entity in the tree no longer empties its other open occurrences.
