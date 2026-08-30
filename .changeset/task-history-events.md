---
'@dxos/echo': minor
---

`Task.edit`, `Task.setStatus`, `Task.assign`, `Task.recordCreated` and `Task.appendHistory` write a field and the activity-log entry describing it in one transaction; an edit that changes nothing records nothing. `UpdateTask` goes through them, so a patched task now carries its own history.

**Breaking:** `Task.Event` is now `created | updated` — the `status-changed`, `assigned`, `moved`, `commented` and `delegated` literals are gone, and a history entry's `description` is optional. Nothing wrote the log before this release, so no stored task carries a removed value.
