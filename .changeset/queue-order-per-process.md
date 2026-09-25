---
'@dxos/compute-runtime': patch
---

The remote command queue orders commands per process rather than across the whole queue. A command
the host will never accept now holds up only its own process — the flusher backs off per process and
delivers for another one meanwhile — instead of being discarded after a timeout, which could drop
work a user asked for during a long outage. Terminating the stuck process is what releases its
commands.
