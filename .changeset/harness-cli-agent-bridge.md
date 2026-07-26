---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

Fix headless CLI profile bootstrap. The bun SQLite platform now creates the database file's parent directory before opening it (mirroring the node platform), so a FILE-mode profile can open on a fresh profile. `dx halo create` is re-registered to provision a local identity and personal space; when run with `--noAgent` (no EDGE agent) it flushes indexes locally and skips the edge replication/sync step, so a network-free bootstrap does not block on an unreachable edge.
