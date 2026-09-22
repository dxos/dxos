---
'@dxos/echo': patch
---

`db.flush()` now has the host save only the documents this client wrote since its last flush, instead of every loaded document. The patched `@automerge/automerge-repo` looks documents up by id without re-validating the id, and compares saved heads without encoding them. Together these cut the client worker's allocation by about a quarter while bulk-creating objects.
