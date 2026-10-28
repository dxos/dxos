---
'@dxos/plugin-inbox': patch
---

The Sync button's pending meter clears itself when no run takes it over, instead of failing with "Timed out: sync reported no progress". Remote progress arrives over best-effort swarm broadcasts, so a successful sync whose updates were lost is not a failed one. A failed sync request, or a run that reports its failure, still shows as an error.
