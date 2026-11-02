---
'@dxos/plugin-google': patch
---

Gmail sync no longer loses messages during a capped backfill. When the newest day held more than two runs' worth of mail, the forward window's re-list of that day committed its oldest messages first, and the messages between them and the previous run's oldest were then skipped as already synced. The forward window now leaves a message older than the window to the backward walk.
