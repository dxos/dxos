---
'@dxos/graph': patch
'@dxos/app-graph': patch
---

Fix a quadratic in bulk node removal.

Dropping a connector's whole node set rebuilt the model's O(E) adjacency index once per removed
edge, because the orphan check read the full edge record of each endpoint. `GraphModel` now
maintains an endpoint-to-edge index and answers `hasEdges(id)` from it, which is all the orphan
check needed. Removing 1000 nodes goes from ~830ms to ~21ms.
