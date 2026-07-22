---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

Fix the mailbox silently dropping synced messages that have no thread. JMAP mail can arrive without a `threadId`; the mail sync now defaults it to the message's own id — a thread of one — so the mailbox list's whole-thread semi-join and conversation grouping no longer exclude them.
