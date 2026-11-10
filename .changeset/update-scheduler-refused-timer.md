---
'@dxos/async': patch
---

`UpdateScheduler` no longer wedges when Cloudflare Workers refuse its throttle timer. Outside a request, such as in a FinalizationRegistry callback that releases an ECHO document, `setTimeout` throws; the pending run used to keep the scheduler marked as scheduled, so every later `flush` waited until the invocation deadline, and the error closed the `RepoProxy`. The run now gives up its slot and the next trigger does the work.
