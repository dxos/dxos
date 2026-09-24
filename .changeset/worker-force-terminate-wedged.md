---
'@dxos/worker-framework': patch
---

Worker displacement now has a second level for a worker that will not displace itself.

Displacement is a `BroadcastChannel` signal, so it only works on a worker that is still servicing its event loop. One wedged in a busy CPU loop never runs `shutdown()`, so it releases neither its liveness lock nor the storage lock, and the next leader burns its whole 15s budget and fails with `Worker connection timed out: opening worker leader session`.

A starting worker now arms a grace period (`Worker.Options.displaceGraceTimeout`, default 10s) when it broadcasts the stop signal. If the storage lock has still not been granted when it expires, it escalates on the same channel with a `terminate` action addressed at the _tab_ holding the incumbent's `Worker` handle, which terminates it and frees the lock. The worker's `ready` message carries the two fields this needs — `workerId` and `displaceChannel`.

The kill is a fault, not routine displacement, so the tab that performs it reports a `WorkerTerminationError` at error level — carrying the storage lock, both worker ids and the grace period that elapsed — and closes the session with that same error.

The escalation is broadcast, and a queued worker cannot know which worker holds the storage lock, so the decision of whether to act on one is taken locally by each tab: it terminates its worker only when the escalation came from another worker, its worker still holds its liveness lock (held over exactly the interval the storage lock is), and its worker fails to answer a `ping` within `LeaderTimeouts.workerProbeTimeout` (default 1s). Every healthy worker answers, so on a storage lock with three or more tabs only the wedged incumbent is terminated. Messages on the channel are validated against a schema before any of this, so a partial `terminate` cannot cost a worker its life.

Termination needs a handle that can stop the worker: a caller-supplied `MessagePort` cannot, because `close()` leaves `Worker.run` holding both locks, so that case now reports a `WorkerNotTerminableError` instead of a kill that did not happen.

This is complementary to worker-to-worker displacement, not a replacement: it needs the ex-leader tab to be alive and responsive, and when it is not, the cooperative path remains the only option. Escalation fires at most once per worker start and never after the lock is granted, and a tab ignores an escalation raised by the worker it owns, so it cannot become a kill loop.
