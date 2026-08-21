---
'@dxos/echo': minor
---

Registry queries now evaluate `Filter.text` in memory: every whitespace-separated term must appear (case-insensitive) in the entity's serialized string values, including meta keys. Database query paths are unchanged — their index still answers text filters; vector search remains index-only.
