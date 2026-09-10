---
# multiple-changesets: a schema-decode guard in @dxos/ai, not the chess-template rewrite
'@dxos/ai': patch
---

A tool result with no value now serializes as `null` instead of omitting the field, so the next model request no longer fails schema decode.
