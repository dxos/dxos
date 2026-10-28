---
'@dxos/app-toolkit': patch
'@dxos/plugin-inbox': patch
---

Progress meters no longer show an error when a run's updates stop arriving. Remote progress travels over best-effort swarm broadcasts, so silence is not a failure: a run's meter that goes 90 s without an update is removed rather than failed as "Stopped reporting", and the Sync button's pending meter clears itself when no run takes it over, rather than failing with "Timed out: sync reported no progress". A failed sync request, or a run's reported failure, still shows as an error.
