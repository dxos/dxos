---
'@dxos/link': patch
---

`Cursor.writeSnapshot` writes only the fields that changed and skips a snapshot that is already stored. It used to replace the whole `spec.snapshots` map on every write, so each write re-stored every snapshot before it and an unchanged sync re-stored them all again. A first GitHub import of 152 pull requests grew one cursor document to 45.7 million Automerge operations for 660 KB of data, which ran the worker's Automerge WASM out of memory on load and stopped Composer from booting. The GitHub, Linear and Trello syncs all write through this helper.
