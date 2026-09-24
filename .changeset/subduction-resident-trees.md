---
'@dxos/echo': patch
---

The storage worker keeps at most 128 Subduction trees loaded (configurable through `AutomergeHost`'s `residency.maxResidentTrees`) and frees the wasm handles the storage bridge receives from Subduction, so its memory no longer grows with every document it has touched.
