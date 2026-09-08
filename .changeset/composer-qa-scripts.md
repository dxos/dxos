---
'@dxos/plugin-review': minor
'@dxos/ui-editor': patch
---

Operations that let an agent drive Composer end to end through the debug port, and two fixes found by doing so.

- `review.create` accepts `range: { from, to }` (character offsets, converted to the editor's cursor anchor), and `text` + `sender` to submit the thread with a first message; it now returns `{ threadId, anchorId }`.
- `assistant.runPromptInChat` accepts `companionTo` in place of `chat`, resolving and persisting the object's companion chat the way the companion's own submit does. `ensureCompanionChat` and `runPromptInChat` activate the assistant plugin themselves, so they work before the assistant UI has been opened.
- `debug.snapshot` reports spaces, toasts, errors since a timestamp, comment threads per plank and a markdown document's text; `debug.revertLast` undoes the last undoable operation as the undo toast does; `composer.invoke` forwards a `spaceId`.
- The editor's comments extension no longer throws from a state update when a thread's anchor is not a valid cursor pair (`Cursor.getRangeFromCursor` returns `undefined`).
