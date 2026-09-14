---
'@dxos/compute-runtime': patch
---

The EDGE function runtime provides `Hypergraph.Service`. An operation that must find its own space
rather than be told it declares the graph instead of `Database.Service`, but `FunctionContext`
provided a layer only for the database — so every such invocation died as
`Service not found: @dxos/echo/Hypergraph/Service` before its handler ran, which is what
`org.dxos.operation.tasks.recordSession` had been doing for 100% of its calls in production.

The graph is the one the function context already opens its databases against, so it holds whichever
space the invocation named and answers a cross-space lookup with that space's contents; an
invocation naming no space reaches an empty graph and takes the operation's own "tell me a space"
path rather than failing. Where no data service is wired at all the runtime falls back to
`Hypergraph.notAvailable`, which reports the missing graph at the call.

`Registry.Service` is now read off the same client graph, so the registry a handler reaches through
`Hypergraph.Service` and the one it resolves directly are the same object whether or not a space was
named (they already were wherever a database existed).
