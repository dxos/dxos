---
'@dxos/echo': patch
---

Indexing passes no longer read feeds that have nothing new: a caught-up feed is answered from memory instead of SQLite, and the two index legs of a pass share one read. Background passes started by trace-feed appends are coalesced to at most one per second, so an agent turn's trace writes no longer keep the database worker busy. `flush` and feed-scoped queries still see trace messages immediately.
