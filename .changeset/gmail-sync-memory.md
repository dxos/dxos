---
'@dxos/link': patch
'@dxos/plugin-google': patch
---

Large Gmail mailboxes sync again: attachments past the inline blob cap are skipped before download, the dedup seed reads 50 messages per query instead of loading 1,000 objects at once (which outgrew EDGE's 32 MiB query cap), a binding whose mailbox was deleted is skipped instead of failing every run, and a reference to a deleted object no longer downloads every feed in the space. Scheduled local syncs no longer fail on an unset `priority`, and one bad trigger or failed tick no longer stops the local trigger runner until a reload.
