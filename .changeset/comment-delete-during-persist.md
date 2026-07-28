---
'@dxos/plugin-review': patch
---

Deleting a comment thread immediately after posting it no longer silently leaves the comment in place. Submitting a comment persists the thread and then clears its draft entry, so a delete issued in between saw the comment as an unpersisted draft, discarded only that bookkeeping, and let the persist finish — the mark stayed in the document and the thread stayed in the sidebar. The draft entry is now treated as a claim: a delete consumes it, and a submit that finds its claim gone rolls the persist back. Such a delete is also undoable, as it already was outside the race.
