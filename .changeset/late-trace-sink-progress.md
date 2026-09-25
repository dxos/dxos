---
'@dxos/app-framework': patch
---

Resolve trace sinks per write instead of snapshotting them when the process-manager runtime is built. A sink contributed by an on-demand module (plugin-progress contributes its progress adapter that way) landed after the snapshot and was silently dropped, so every operation's `status.update` reached the durable sink while the progress meters stayed empty.
