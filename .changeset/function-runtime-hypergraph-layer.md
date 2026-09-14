---
'@dxos/compute-runtime': patch
---

`Registry.Service` is read off the function context's client graph rather than its database, so the
registry a handler reaches through `Hypergraph.Service` and the one it resolves directly are the
same object whether or not the invocation named a space. They already were wherever a database
exists — `db.graph` _is_ `client.graph` — so this only closes the space-less case, which the
cross-space handle made reachable.

Adds coverage for that handle over a live peer: an invocation naming no space reaches the graph and
runs a `from('all-accessible-spaces')` lookup to an empty answer, an invocation naming a space finds
that space's database on the graph, and a context with no data service reports
`Hypergraph not available` at the call rather than resolving to nothing.
