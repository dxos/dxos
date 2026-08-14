---
'@dxos/echo': minor
'@dxos/plugin-inbox': patch
---

`Aggregate.group` now accepts a `coalesce` chain (`Aggregate.group({ coalesce: ['threadId', 'id'] })`), keying each group on the first property holding a scalar value, with `id` resolving to the object's entity id. Breaking: the `group` aggregate's query-AST field is now `properties` (a fallback chain) instead of `property`.
