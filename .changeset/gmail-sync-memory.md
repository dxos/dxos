---
'@dxos/link': patch
'@dxos/plugin-google': patch
---

Large Gmail mailboxes sync again: attachments past the inline blob cap are skipped before download, the dedup seed reads 50 messages per query instead of 1,000 objects at once (which outgrew EDGE's 32 MiB query cap), a binding whose mailbox was deleted no longer fails every run, and a reference to a deleted object no longer downloads every feed in the space. Local syncs no longer fail on an unset `priority`, one bad trigger or failed tick no longer stops the trigger runner until a reload, and feed reads under Safari 18 (the macOS desktop app) no longer fail with `RangeError: Bad value` once a worker has decoded 2 GiB.
