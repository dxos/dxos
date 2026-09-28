---
'@dxos/echo': patch
---

`AutomergeHost` no longer keeps the 256 most recently released documents loaded regardless of age: a released document is evicted after the 30-second idle delay, and later documents reuse its Automerge memory. Hosts can still set a floor through the `residency` option.
