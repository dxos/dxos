---
'@dxos/link': patch
'@dxos/plugin-google': patch
---

Gmail sync no longer overruns EDGE's memory and query limits on large mailboxes. Attachments past the inline blob cap are now skipped before download (the sync discarded them after downloading anyway), and the cursor's dedup seed reads the feed 50 messages per query instead of loading the newest and oldest 500 objects, bodies and attachment blobs included, in two queries whose responses outgrew EDGE's 32 MiB cap and failed every run.
