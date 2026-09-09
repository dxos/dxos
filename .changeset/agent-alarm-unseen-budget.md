---
'@dxos/echo': patch
---

Fix a self-scheduled alarm being dropped before the space index caught up.

An alarm this incarnation wrote is held until a read confirms the index has it, so the wake is
armed from the record rather than from a read of it. That holding set was pruned by comparing the
alarm's due time to now, which is not a signal about the index: an alarm set for an instant already
past reads as due on the very first look, before any read has had a chance to show it, so the entry
was dropped immediately and nothing was ever armed. Pruning is now bounded by the number of reads
that failed to show the alarm, which does distinguish an index still catching up from an alarm that
is gone.
