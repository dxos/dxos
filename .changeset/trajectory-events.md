---
'@dxos/echo': minor
---

Agent chats are now stored as an append-only log of `Trajectory.Event`s. Older feeds still load because their messages, bindings, alarms and fork links are converted to events in memory. Folded state is cached in SQLite, so reopening a chat reads only the events written since. Feeds can be read in local insertion order with `Filter.feedCursor({ order: 'local' })`. Breaking: chat feeds no longer receive new `Message`, `AiContext.Binding`, `Alarm` or `SessionLink` records, and `SessionStore.markInFlight` is removed.
