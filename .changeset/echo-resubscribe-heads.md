---
'@dxos/echo': patch
---

A tab that resubscribes to its documents, as it does when a new storage worker takes over, now reports the heads it holds, and the worker sends only the changes the tab lacks instead of a full copy of every document.
