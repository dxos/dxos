---
'@dxos/echo': minor
---

Evaluate queries in SQLite by default. Filtering, ordering, limits, deletion-state resolution and reference traversal now run inside one compiled statement instead of loading every candidate document into JavaScript, which removes the per-candidate document loads from the read path. Set `runtime.client.queryExecutor: MEMORY` (or `DX_ECHO_QUERY_EXECUTOR=memory`) to restore the previous in-memory evaluation.

Ordering is unchanged from the previous release: both paths compare strings by code unit. Query shapes the compiler declines still fall back to in-memory evaluation per query, so results do not depend on which path answered.
