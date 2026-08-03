---
'@dxos/cli-util': patch
'@dxos/plugin-space': minor
---

Add `dx space export` and `dx space import` commands. Export writes a space archive to disk in either the binary storage-dump format (includes document history) or a JSON snapshot of current object state; import reads an archive of either format back as a new space.
