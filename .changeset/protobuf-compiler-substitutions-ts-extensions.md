---
'@dxos/protobuf-compiler': patch
---

Fix `parseSubstitutionsFile` silently dropping every substitution (falling back to raw wire-format types for `google.protobuf.Any`, `Timestamp`, and any custom substitution) when a `substitutions.ts` file's relative imports used explicit `.ts`/`.tsx` extensions. The isolated `ts-morph` parser used to type-check substitutions vendors an older TypeScript that rejects such imports outright, which poisoned the whole file's inferred type to `any`.
