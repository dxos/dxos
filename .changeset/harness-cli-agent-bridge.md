---
'@dxos/sql-sqlite': patch
'@dxos/plugin-client': patch
---

Fix headless CLI profile bootstrap. The bun SQLite platform now creates the database file's parent directory before opening it (mirroring the node platform), so a FILE-mode profile can open on a fresh profile. `dx halo create` is re-registered to provision a local identity and personal space with no network, and its edge replication/sync step is gated behind `--agent` so a `--noAgent` bootstrap does not block on an unreachable edge.
