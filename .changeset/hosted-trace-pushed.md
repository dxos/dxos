---
'@dxos/compute-runtime': patch
---

Deliver a remotely hosted process's ephemeral trace as it is produced, rather than by polling.

`subscribeEphemeral` discovered a remote process's trace by paging the host's event ring, and the
host flushes that ring at the end of an invocation — so a reader could not see a turn arriving at
all until it was over, however well the provider streamed, and it polled at a fixed interval
besides. Given a `RemoteTraceMonitor` the handle now replays the buffered ring once and then follows
the pushed stream; with none it polls as before, so local-only deployments are unchanged. The
monitor is resolved optionally, so no construction site changes shape and consumers keep calling
`subscribeEphemeral`.
