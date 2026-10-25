---
'@dxos/echo': minor
'@dxos/plugin-assistant': minor
---

Agent chats are now stored as an append-only log of `Trajectory.Event`s. Older feeds still load because their messages, bindings, alarms and fork links are converted to events in memory. Folded state is cached in SQLite, so reopening a chat reads only the events written since. Feeds can be read in local insertion order with `Filter.feedCursor({ order: 'local' })`, including feeds whose indexing is off. New chat feeds are created with indexing off (`TrajectoryStore.makeFeed`), so their events are not indexed or text-searchable. Breaking: chat feeds no longer receive new `Message`, `AiContext.Binding`, `Alarm` or `SessionLink` records, and `SessionStore.markInFlight` is removed.

Light threads: with the assistant's new **Parallel threads** setting on, a prompt sent while the agent works starts a thread that runs in parallel instead of waiting. The new thread starts with a transcript of every running thread and can wait for one with the `thread_wait` tool; finished threads join the conversation. The chat colours each thread's gutter; a thread a newer prompt sends to the background becomes a card in its original place, and its answer appears where it completes. Another installed agent can share the chat (**Parallel thread agents**): a prompt starting with `@<agent>` runs on that agent, in a lane of its own. The trace panel draws each thread as a lane of its own.
