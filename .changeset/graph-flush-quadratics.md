---
'@dxos/graph': patch
'@dxos/app-graph': patch
---

Remove four quadratics and an encode from the app graph flush path.

The model's adjacency index was rebuilt from the schema encoder on every version bump, so each
mutation re-materialized the whole graph as arrays; it is now maintained incrementally in
insertion-ordered maps. `addEdge` built the source node's entire edge record to test membership that
`_setEdge` already does by id, `sortEdges` and the builder's connector diff used `includes` scans
inside filters, and a per-edge log entry cost more than the write.

Expanding 1000 connector nodes is ~1.5x faster than before the graph consolidation; updates, reads,
traversal and path search are at parity.
