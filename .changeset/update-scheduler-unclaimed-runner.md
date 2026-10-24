---
'@dxos/async': patch
'@dxos/echo-client': patch
---

`UpdateScheduler` no longer wedges when a runner cannot set its throttle timer. On Cloudflare Workers `setTimeout` throws outside a request, for example when a FinalizationRegistry callback releases an ECHO document, and that runner used to keep the scheduler marked as scheduled for good. Every later flush in the invocation then hung until the deadline. Before this, the error also reached the `RepoProxy` context and closed the proxy, which surfaced as `RepoClosedError` on the next write. Now the runner gives up its slot without raising, the work stays queued for the next trigger, and a `runBlocking` caller that was waiting on it triggers a run of its own. `EntityManager.flush` logs `flush stalled` with its phase and the unsent counts when it waits longer than 10 seconds.
