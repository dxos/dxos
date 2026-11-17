# echo-memory packages for Composer and the browser

Where `MemoryService` lives once Composer uses it in the browser. It sits beside `SPEC.mdl`
(`org.dxos.echo-memory`); the decisions are D-34 to D-45 there.

## Today

| Where                    | Facts                                                      | Subscriptions              | Survives a reload |
| ------------------------ | ---------------------------------------------------------- | -------------------------- | ----------------- |
| Composer, `plugin-brain` | `FactStoreLive.makeMemory()`, one per space, in the tab    | none                       | no                |
| Composer, `plugin-agent` | `BrainMemory`: `FactStoreLive.makeMemory()` per agent      | JS maps in the tab         | no                |
| Composer → EDGE          | `BrainWire` proxies `BrainService` to EDGE's `BrainObject` | EDGE Durable Object SQLite | yes               |
| CLI and tests (node)     | `FactStoreLive.layerFile` / `layerMemory`                  | none                       | file only         |

## Packages

```
@dxos/echo-memory              flat noun modules: MemoryService, RdfStore, Fact,    every platform
                               MemoryQuery, … and the RDF mapping (n3), each a
                               subpath of its own
@dxos/echo-memory-sqlite       RdfMemory: the memory core over any RdfStore;        every platform
                               LocalRdfStore and MemorySqlite layers               node, bun (CLI)
@dxos/sparql-sqlite            QuadStore: log-first quad store, shared and local    every platform
                               parts; /exchange: TriG and binary
client-services (existing)     SpaceMemories: per space, one QuadStore over the     browser worker, node
                               host's own SQLite database, logged to the space's
                               `facts` feed, and one RdfMemory over it; served as
                               MemoryService and RdfStoreService RPCs
@dxos/client                   client.memory(spaceId), client.rdf(spaceId)          page
plugin-client (existing)       space layers: MemoryService and RdfStore for         Composer
                               operations
```

1. **`@dxos/echo-memory`** stays interface-only: the `MemoryService` a caller uses and the `RdfStore` a memory
   runs on. Like `@dxos/echo` it is a flat set of noun modules, each a subpath; the RDF mapping modules
   need `n3`, so workerd-reachable packages import the port modules by subpath.
2. **`@dxos/echo-memory-sqlite`** has one core, `RdfMemory.make(rdf)`, with no platform code: queries become
   SPARQL, writes become batches, and its own records are quads in the store's local part.
   `LocalRdfStore` and `MemorySqlite` run it in one process over native SQLite.
3. **The backend runs the store and the memory [F-9.1].** client-services runs `@dxos/sparql-sqlite`'s quad store
   over the database it already has, and `RdfMemory` over it, one per space, so every page and operation shares
   one rule evaluator, outbox set and clock (D-50). Every shared batch is appended to the space's
   `facts` feed first and applied by reading it back, so the feed replicates the store and rebuilds it.
   Export and import are serialized and parsed there, beside the store [F-10].
4. **Pages and operations call it.** `client.memory(spaceId)` is a space's MemoryService over the bridge, and
   plugin-client's space-affinity layer gives it to an operation that asks for `MemoryService`. Agent memory on
   EDGE comes through the host-service proxy, which replaces `BrainWire`.

## Questions

1. EDGE must accept the `facts` namespace before the feed replicates: edge pins `@dxos/protocols`, whose
   `isWellKnownNamespace` gates the queue replicator. Does EDGE also run a memory over the replicated
   feed (one Durable Object per space, [F-7.4]), or only store the feed?
