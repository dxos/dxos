---
'@dxos/echo': patch
---

Fix `RangeError: Maximum call stack size exceeded` when a recursive JSON Schema is rebuilt or projected onto an AI tool. `JsonSchema.toEffectSchema` now resolves a cyclic `$ref` through `Schema.suspend` instead of recursing into it, the LLM-facing tool projection rewrites a suspended node lazily, and a projected tool carries the `$defs` its `$ref`s point at. A stored operation whose schema still cannot be rebuilt is now dropped from the toolkit rather than failing the whole request.
