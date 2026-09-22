---
'@dxos/assistant': minor
'@dxos/plugin-assistant': patch
---

Agent process state now lives in the session feed: queued prompts are Messages carrying a queued annotation, alarms are a new `Alarm` feed record (several may be pending at once), and both are managed with regular feed CRUD. A queue entry is marked consumed only after the turn it drove, so an interrupted turn is redelivered rather than lost. `SessionLoader` is renamed `SessionStore` and gains the read/write surface (`loadState`, `loadPending`, `enqueueMessage`, `ack`, `setAlarm`, `cancelAlarm`). The chat UI surfaces both: queued prompts stack above the composer and are cancellable, the next alarm shows in the status pill, and submitting during a running turn queues behind it instead of being dropped. Breaking: `SessionLoader` no longer exists, and the set-alarm operation no longer replaces the previous alarm.
