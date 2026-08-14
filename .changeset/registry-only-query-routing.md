---
'@dxos/echo-client': patch
---

Registry-only queries are no longer forwarded to the remote query service. A query whose explicit `from` scopes contain no space or feed scope — e.g. `Query.select(...).from(Scope.registry())` — is answered entirely by the in-process registry source, so `IndexQuerySource` now resolves it locally instead of issuing a `QueryService.execQuery` round-trip.

Previously such a query still went remote. Hosts that reject space-less queries (EDGE) failed it, and because query sources are merged fail-fast, that rejection discarded the registry source's correct results and failed the whole query — breaking every operation that resolves a type through the registry (`SpaceOperation.AddObject`, and so anything filing an object into the graph). Browser hosts masked it by returning empty for registry scopes.

Mixed-scope queries (`Scope.space(), Scope.registry()`) are unchanged: they still query the index for the space part.
