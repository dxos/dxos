---
'@dxos/echo-client': patch
---

The transitive deletion check (`Obj.isDeleted`, and the one query recompute runs per candidate) is about 4× faster: an entity's deletion-relevant system fields are read once per document change, not on every check.
