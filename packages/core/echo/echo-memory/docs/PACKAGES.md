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
@dxos/echo-memory              MemoryService and RdfStore ports, data model         every platform
@dxos/echo-memory/rdf          facts <-> RDF and fact queries -> SPARQL (n3)        every platform
@dxos/echo-memory-sqlite       RdfMemory: the memory core over any RdfStore;        every platform
                               LocalRdfStore and MemorySqlite layers               node, bun (CLI)
@dxos/sparql-sqlite            QuadStore: log-first quad store, shared and local    every platform
                               parts; /exchange: TriG and binary
client-services (existing)     RdfHostLayer: one QuadStore per space over the       browser worker, node
                               host's own SQLite database, logged to the space's
                               `facts` feed; served over the bridge
@dxos/client                   client.rdf(spaceId): RdfStore over the bridge        page
plugin-memory (new) or         RdfMemory.make(client.rdf(spaceId)) per space        Composer
plugin-brain (existing)
```

1. **`@dxos/echo-memory`** stays interface-only: the `MemoryService` a caller uses and the `RdfStore` a memory
   runs on. Its `rdf` subpath holds the RDF mapping, which needs `n3` and so stays off the main entry.
2. **`@dxos/echo-memory-sqlite`** has one core, `RdfMemory.make(rdf)`, with no platform code: queries become
   SPARQL, writes become batches, and its own records are quads in the store's local part.
   `LocalRdfStore` and `MemorySqlite` run it in one process over native SQLite.
3. **The backend is thin [F-9.1].** client-services runs `@dxos/sparql-sqlite`'s quad store over the database it
   already has, and nothing that knows about facts or rules. Every shared batch is appended to the space's
   `facts` feed first and applied by reading it back, so the feed replicates the store and rebuilds it.
   Export and import are serialized and parsed there, beside the store [F-10].
4. **The memory runs in the page.** A Composer capability gives each space `RdfMemory.make(client.rdf(spaceId))`;
   rule evaluation and outboxes live in the page, their records in the store's local part. Agent memory on
   EDGE comes through the host-service proxy, which replaces `BrainWire`.

## Questions

1. Where does the Composer capability live?
   1. A new `plugin-memory` that plugin-agent and plugin-brain both depend on (preferred).
   2. In `plugin-brain`, with plugin-agent depending on plugin-brain.
2. EDGE must accept the `facts` namespace before the feed replicates: edge pins `@dxos/protocols`, whose
   `isWellKnownNamespace` gates the queue replicator. Does EDGE also run a memory over the replicated
   feed (one Durable Object per space, [F-7.4]), or only store the feed?
3. Two tabs on one space each run a memory over the same store, so each evaluates the rules and both write
   the same outbox records. Should one tab (the leader) own the event base?
