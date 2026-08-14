---
'@dxos/assistant-toolkit': minor
---

The database skill's `schema-list` tool now returns lightweight summaries (typename, kind, name, description, fields) by default instead of the full JSON Schema for every type; pass `typenames` to fetch the full JSON Schema for specific types.
