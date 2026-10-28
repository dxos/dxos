---
'@dxos/app-toolkit': patch
'@dxos/compute-runtime': patch
'@dxos/plugin-client': patch
---

An EDGE run's progress meter now takes over from the pending meter a sync button starts, instead of timing out with "sync reported no progress". The remote trace subscription ignores messages that are not trace broadcasts and skips a payload that does not decode, where either used to end it for the session. Progress broadcasts may arrive in any order: a run's count no longer moves back, and an update from the same run that lands within 10 s after its terminal no longer reopens its meter.
