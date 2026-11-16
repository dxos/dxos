# echo-memory packages for Composer and the browser

A plan for where `MemoryService` lives once Composer uses it in the browser. It sits beside `SPEC.mdl`
(`org.dxos.echo-memory`) and turns into spec decisions once the open questions are answered.

## Today

| Where                    | Facts                                                      | Subscriptions              | Survives a reload |
| ------------------------ | ---------------------------------------------------------- | -------------------------- | ----------------- |
| Composer, `plugin-brain` | `FactStoreLive.makeMemory()`, one per space, in the tab    | none                       | no                |
| Composer, `plugin-agent` | `BrainMemory`: `FactStoreLive.makeMemory()` per agent      | JS maps in the tab         | no                |
| Composer → EDGE          | `BrainWire` proxies `BrainService` to EDGE's `BrainObject` | EDGE Durable Object SQLite | yes               |
| CLI and tests (node)     | `FactStoreLive.layerFile` / `layerMemory`                  | none                       | file only         |

The in-tab stores use wa-sqlite's synchronous in-memory build: `@dxos/sql-sqlite/SqlStorage` resolves to
wa-sqlite in the browser, `node:sqlite` in node and bun, and the Durable Object's SQL in workerd. Its
`makeFile` fails in the browser; persistent browser SQLite lives behind `@dxos/sql-sqlite`'s OPFS worker.

## Packages

```
@dxos/echo-memory              interface, data model, MemoryWire codec            every platform
@dxos/echo-memory-sqlite       MemorySqlite: core over SqlStorage; layerMemory;    every platform
                               layerFile (node, bun); FactLog (memory, feed)
client-services (existing)     MemoryHost: one MemorySqlite per space over the     browser worker, node
                               host's own SQLite database, with a FactLog over
                               the space's `facts` feed; served over the bridge
plugin-memory (new) or         MemoryService for a space: a bridge client in the   Composer
plugin-brain (existing)        page; the host-service proxy for agent memory
```

1. **`@dxos/echo-memory`** stays interface-only. It also holds **`MemoryWire`**: a pure codec that turns a
   `MemoryService` into a record of JSON-in, JSON-out functions and back, using each query kind's result
   schema [F-3.7]. The client-services bridge, HTTP, EDGE RPC and the app-framework host-service proxy all
   move only JSON through it.
2. **`@dxos/echo-memory-sqlite`** has one core, `MemorySqlite.make(storage, { log })`, with no platform
   code. Given a `FactLog`, every `put` and `reset` is appended to the log first and applied by reading it
   back; the store keeps its log cursor in `memory_state`, follows entries other replicas add, and rebuilds
   itself from the log when empty [F-9]. `FactLog.feed` keeps the log in the space's feed in the `facts`
   namespace; `FactLog.memory` is for tests.
3. **The backend is client-services, over the database it already has [F-9.1].** The page holds no store.
   It sends memory calls, SPARQL included, over the bridge; the backend's `MemoryHost` opens one
   `MemorySqlite` per space over the host's existing SQLite database (its tables sit beside ECHO's, with
   their own `memory_` and quad-store names) and a `FactLog.feed` over the host's `FeedStore`. The facts
   feed replicates through the existing feed sync, so another device's backend applies the same writes.
4. **Composer wiring** is one capability: `(spaceId) => Layer<MemoryService>`, a bridge client for space
   memory. Agent memory on EDGE comes through the host-service proxy, which replaces `BrainWire`.
   plugin-agent and plugin-brain both depend on that capability; `FactStoreRegistry` and `BrainMemory`
   go away.

## Questions

1. ~~Synchronous access to the host's database.~~ Resolved [F-9.7]: `@dxos/sparql-sqlite` has an async
   engine (`@dxos/sparql-sqlite/async`) over Effect's `SqlClient`, so the backend uses its existing
   connection as is. `MemorySqlite` and pipeline-rdf's store still need async variants on top of it.
2. Where does the Composer capability live?
   1. A new `plugin-memory` that plugin-agent and plugin-brain both depend on (preferred).
   2. In `plugin-brain`, with plugin-agent depending on plugin-brain.
3. EDGE must accept the `facts` namespace before the feed replicates: edge pins `@dxos/protocols`, whose
   `isWellKnownNamespace` gates the queue replicator. Does EDGE also run a memory over the replicated
   feed (one Durable Object per space, [F-7.4]), or only store the feed?
