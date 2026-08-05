---
'@dxos/echo': patch
---

Report writes that were never sent, and stop a scheduled callback from running concurrently with itself. `UpdateScheduler` now starts its callback from a single site: `runBlocking`/`forceTrigger` funnel into the scheduled runner instead of claiming it themselves, so two passes can no longer each claim part of the shared queue — the loss behind server-side writes arriving without their data. `RepoProxy.flush()` rejects when a batch could not be sent instead of always resolving, so a short-lived writer whose isolate is disposed the moment flush resolves can fail its operation rather than silently drop the write.
