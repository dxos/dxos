---
'@dxos/echo': patch
---

`Filter.childOf` queries find matches by walking down from the named parents through the parent index, instead of walking up from every candidate object, so their cost follows the size of the subtree rather than the number of candidates.
