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

## Proposed packages

```
@dxos/echo-memory              interface, data model, MemoryWire codec          every platform
@dxos/echo-memory-native       core over SqlStorage; layerMemory; layerFile;     every platform
                               ./http client + handler                           (layerFile: node, bun)
client-services (existing)     MemoryHost: one memory per space, beside ECHO      browser worker, node
                               in the worker, served over the client RPC
plugin-memory (new) or         MemoryService for the current space, from the     Composer
plugin-brain (existing)        client (local) or from EDGE (agent memory)
```

1. **`@dxos/echo-memory`** stays interface-only. It also holds **`MemoryWire`**: a pure codec that turns
   a `MemoryService` into a record of JSON-in, JSON-out functions and back. It uses each query kind's
   result schema [F-3.7]. Every transport uses the same codec: HTTP, EDGE RPC, the app-framework
   host-service proxy, and the client RPC. Each of those then only moves JSON.
2. **`@dxos/echo-memory-native`** has one core, `make(storage: SqlStorage)`, with no platform code. It
   runs wherever `@dxos/sql-sqlite/SqlStorage` does. `layerMemory` therefore works in a browser tab
   unchanged. `layerFile` works in node and bun. `./http` is a separate export, so a browser bundle
   that uses memory does not load the HTTP handler.
3. **Persistent browser memory runs in the worker, beside ECHO.** Composer's ECHO host already runs in
   a worker that owns OPFS. A `MemoryHost` there opens one native memory per space over an OPFS-backed
   database and serves it to tabs over the client RPC, through `MemoryWire`. Tabs never open SQLite for
   memory. Every tab sees the same memory, and it survives a reload.
4. **Composer wiring** is one capability: `(spaceId) => Layer<MemoryService>`. It is backed by the
   client's `MemoryHost` for space memory. Agent memory on EDGE is backed by the host-service proxy,
   which replaces `BrainWire`. plugin-agent and plugin-brain both depend on that capability, not on
   each other's stores. `FactStoreRegistry` and `BrainMemory` go away.

Until `MemoryHost` exists, step 4 can use `layerMemory` in the tab. That is today's behaviour, with the
new interface.

## Questions

1. Can the worker give `SqlStorage` a **synchronous** OPFS database? The native core needs one, because
   the RDF store runs synchronous SQL. Options:
   1. **Sync VFS in the worker:** wa-sqlite's sync OPFS VFS, opened inside the worker (preferred).
   2. **Snapshot:** keep memory in-memory in the worker, and save it to OPFS with `SqlExport` on a timer
      and at shutdown.
   3. **Async port:** add an async storage interface to `@dxos/sparql-sqlite`. This is the most work.
2. Where does the Composer capability live?
   1. A new `plugin-memory` that plugin-agent and plugin-brain both depend on (preferred).
   2. In `plugin-brain`, with plugin-agent depending on plugin-brain.
3. Should Composer reach space memory through the worker always? Or should it keep a tab-local
   `layerMemory` for spaces that are not open in the worker, for example a sample space in storybook?
4. Does a space's memory replicate to other devices? Options:
   1. **Local:** each device, and EDGE, keeps its own memory, rebuilt from the same sources.
   2. **Via EDGE:** EDGE's space memory is the shared copy; devices query it.

   This also decides whether the facts become ECHO data or stay outside ECHO.
