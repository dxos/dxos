---
'@dxos/link': patch
'@dxos/plugin-connector': patch
---

Restore the Connect action on a mailbox or calendar whose connection was deleted, and keep its sync progress: deleting a connection now leaves its bindings dormant (cursors kept, schedules suspended) instead of stranding them, re-connecting the same account resumes a dormant binding where it left off, and connecting an account the object does not already sync is refused rather than merged into it.
