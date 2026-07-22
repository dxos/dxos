---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

Fix the mailbox silently dropping messages that have no thread. Synced mail (JMAP/Gmail) and drafts now default a missing `threadId` to the message's own id — a thread of one — via the new `Message.ensureThreadId`, so the mailbox list's whole-thread semi-join and conversation grouping no longer exclude them.
