---
'@dxos/assistant': minor
'@dxos/plugin-assistant': patch
---

Agent process state now lives in the session feed: queued prompts are Messages carrying a queued annotation, alarms are a new `Alarm` feed record (several may be pending at once), and a turn dequeues its item by appending a message that acks it by reference — all managed with regular feed CRUD. `SessionLoader` is renamed `SessionStore` and gains the read/write surface (`loadState`, `loadPending`, `enqueueMessage`, `ackMessage`, `setAlarm`, `cancelAlarm`, `ackAlarm`). Breaking: `SessionLoader` no longer exists; the set-alarm operation no longer replaces the previous alarm.
