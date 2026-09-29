---
'@dxos/echo': patch
---

Peers no longer stay stuck on an older copy of a document when EDGE advertises the new commit alongside a stale head they already hold; the collection sync now detects the missing change and reapplies what Subduction already stored locally.
