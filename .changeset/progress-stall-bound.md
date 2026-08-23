---
'@dxos/app-toolkit': patch
---

Bound how long a progress meter will wait on a run that has stopped reporting. Every terminal a
producer can emit travels the same lossy path its progress does — a killed process runs no finalizer,
an Effect defect escapes the error channel that would report one, and a swarm broadcast is
fire-and-forget — so a lost terminal used to pin a meter open indefinitely, sweeping over a run that
was no longer running and (for mailbox sync) leaving the Sync button disabled with it. The trace sink
now fails a monitor that goes 90s without an update, with a reason that claims only what is known
(that it went quiet, not that it failed); the meter keeps its dismiss control, and a later run
recovers the key with its own numbers. Configurable via `stallTimeout`.
