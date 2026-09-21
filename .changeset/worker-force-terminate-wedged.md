---
'@dxos/worker-framework': patch
---

Worker displacement now has a second level for a worker that will not displace itself.

Displacement is a `BroadcastChannel` signal, so it only works on a worker that is still servicing its event loop. One wedged in a busy CPU loop never runs `shutdown()`, so it releases neither its liveness lock nor the storage lock, and the next leader burns its whole 15s budget and fails with `Worker connection timed out: opening worker leader session`.

A starting worker now arms a grace period (`Worker.Options.displaceGraceTimeout`, default 5s) when it broadcasts the stop signal. If the storage lock has still not been granted when it expires, it escalates on the same channel with a `terminate` action addressed at the _tab_ holding the incumbent's `Worker` handle, which terminates it and frees the lock. The worker's `ready` message carries the two fields this needs — `workerId` and `displaceChannel`.

This is complementary to worker-to-worker displacement, not a replacement: it needs the ex-leader tab to be alive and responsive, and when it is not, the cooperative path remains the only option. Escalation fires at most once per worker start and never after the lock is granted, and a tab ignores an escalation raised by the worker it owns, so it cannot become a kill loop.
