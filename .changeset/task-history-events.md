---
'@dxos/echo': minor
---

**Breaking:** `Task.Event` is now `created | updated` — the `status-changed`, `assigned`, `moved`, `commented` and `delegated` literals are gone, and a history entry's `description` is optional. Nothing writes the log yet, so no stored task carries a removed value.
