---
# multiple-changesets: an ECHO query-API addition consumers look up under @dxos/echo, independent of the MCP surface reshape that motivated it
'@dxos/echo': minor
---

In-memory entity matching now evaluates `Filter.text`: every whitespace-separated term must appear (case-insensitive) in the entity's serialized string values, including meta keys. This reaches registry queries, `Filter.toPredicate`, and registry entities inside scoped database queries; the index-backed document paths are unchanged, and vector search remains index-only.
