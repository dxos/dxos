---
'@dxos/echo': minor
'@dxos/plugin-markdown': patch
---

Support combining a full-text search filter with type filters via `Filter.and` — the query planner pushes the type scope down into the FTS index instead of rejecting the query as too complex. The search plugin now scopes full-text results to user-visible types (the same set the nav tree's Database section lists, plus collections), so search no longer surfaces internal objects such as views, stored schemas, or relation rows, and each result takes its icon from the type's annotation like the nav tree and cards do. Mailbox search stays scoped to the active tag view when combining free text with tag terms. Search is now a system plugin, always enabled rather than opt-in under Labs.
