---
'@dxos/echo-client': patch
---

A change the host delivers to a document is no longer treated as an unsaved local change. The repo proxy marked every change on a handle as pending, whatever its source, so replicated edits queued a send back to the host and raised `saveStateChanged`. In Composer the sync status tracker answers that event with a full flush of the space, disk and indexes, after a 500 ms debounce, which under steady sync traffic meant a flush per space twice a second and most of the indexer's requests. Only a change made on this thread now marks the document unsaved. `saveStateChanged` also fires only when the unsaved set differs from the one last reported, so a send carrying only subscription changes no longer reports a save.
