---
'@dxos/echo-client': patch
---

A change the host delivers to a document no longer counts as an unsaved local change, and `saveStateChanged` fires only when the set of unsaved documents changes. Before, every change on a handle was marked pending whatever its source, and every send reported the save state again, including sends that carried only subscription changes. Composer's sync status tracker flushes a space after that event settles, so under steady sync traffic it flushed every space twice a second.
