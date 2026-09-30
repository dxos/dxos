---
'@dxos/client': patch
---

`Client.reset()` completes when the host shuts down before answering, as a dedicated worker does, so the caller's post-reset step (such as opening the join-identity flow) runs.
