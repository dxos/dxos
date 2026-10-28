---
'@dxos/compute-runtime': patch
'@dxos/plugin-client': patch
---

An EDGE run's progress meter now takes over from the pending meter a sync button starts, instead of timing out with "sync reported no progress". The remote trace subscription ignores messages that are not trace broadcasts and skips a payload that does not decode, where either used to end it for the session; and an update that arrives after its run's terminal no longer reopens a meter nothing closes.
