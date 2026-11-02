---
'@dxos/echo': patch
---

Live queries only receive the database writes that can change their results. A write to a type a query does not select, or outside the parents a `childOf` or `.children()` query is scoped to, no longer reaches it, so a tab with many open queries stays fast as more objects load.
