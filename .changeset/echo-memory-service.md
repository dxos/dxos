---
'@dxos/pipeline-rdf': patch
---

Deprecate `FactStore` (`@dxos/pipeline-rdf`) and `BrainService` (`@dxos/plugin-agent`) in favour of `MemoryService` from the new `@dxos/echo-memory`, with a SQLite implementation in `@dxos/echo-memory-sqlite`. Add `facts` to `FeedProtocol.WellKnownNamespaces`, the feed namespace a space's memory writes go to first.
