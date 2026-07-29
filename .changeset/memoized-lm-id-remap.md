---
'@dxos/echo': patch
---

Fix memoized language model dynamic-value remapping: collect tokens over the normalized prompt so timestamp metadata cannot shift positional ids, and preserve per-pattern regex flags so uppercase-hex UUIDs match.
