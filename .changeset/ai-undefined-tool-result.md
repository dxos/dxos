---
'@dxos/ai': patch
---

A tool result with no value now serializes as `null` instead of omitting the field, so the next model request no longer fails schema decode.
