# `@dxos/client-services` — subsystems

The target structure. Supersedes stage 5 of [`REFACTOR.md`](./REFACTOR.md); measured by
[`DEPENDENCY-GRAPH.md`](./DEPENDENCY-GRAPH.md).

`@dxos/client-services` is a composition of four subsystems and the host that wires them,
named after the protocols they serve. The previous structure had 18 peer packlets with no
statement of which were domains and which were plumbing, and one 813-line `layer-specs.ts`
that declared every layer in the package from the outside.

## The two problems this fixes

**1. `layer-specs.ts` was a second, parallel description of the package.** Sixty specs, each
naming a layer that lives somewhere else, in a file that imported from twelve of the eighteen
packlets. To read what the identity subsystem needs you opened `identity/identity-manager.ts`
for the layer and `services/layer-specs.ts` for its requirements — and the two could drift,
because nothing tied them together. It was also the aggregator, so every spec it declared was
an edge from the top of the stack down into a domain module.

**2. Eighteen peers with no tiers.** `metadata`, `pipeline` and `storage` are primitives that
everything sits on; `space` and `spaces` are a domain; `devtools` and `diagnostics` are
introspection. Flattened together, the only way to see the difference was to read the imports.

## The four subsystems

| subsystem  | holds                                                                                                                                  | depends on              |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **Kernel** | `storage` `metadata` `pipeline` — SQLite, hypercore, the metadata store, feed pipelines                                                | nothing in this package |
| **Mesh**   | signalling, transport, the swarm network manager, `NetworkService`                                                                     | Kernel                  |
| **Echo**   | `space` `spaces` `space-export` — the space stack, data spaces, replication, archives, and the `Spaces`/`Data`/`Query`/`Feed` services | Kernel, Mesh            |
| **Halo**   | `identity` `invitations` `devices` — identity, devices, invitations, contacts, recovery, and their services                            | Kernel, Echo            |
| **Host**   | the RPC router, the stack itself, `system` `devtools` `logging` `diagnostics` `worker`                                                 | all of the above        |

`Kernel → {Mesh, Echo} → Halo → Host`, acyclic. Measured:

|               | modules |  edges | largest cycle |
| ------------- | ------: | -----: | ------------: |
| before #13328 |      19 |     57 |            11 |
| after #13328  |      18 |     33 |          none |
| after this    |   **6** | **11** |          none |

The module count falls because a subsystem's internals stop being edges of the package graph:
nesting `storage`, `metadata` and `pipeline` under `kernel/` alone removed six.

Two edges are worth stating because they look wrong and are not:

- **Halo depends on Echo.** The HALO space is an ECHO space: `identity` imports the space stack
  to open it. Inverting this would mean an interface over the whole space, which describes the
  class rather than abstracting it.
- **Echo does not depend on Halo.** It reaches the signing context through
  `Echo/interface.ts`, which Halo provides. This is what the subsystem contracts bought, and
  the graph check enforces it.

## Module shapes

Three shapes, and a module is whichever of them its content calls for:

- **Interface module** — the tags and the interfaces those tags are typed against, and nothing
  else. It may not import an implementation; `dependency-graph.mjs --check` enforces that on
  type edges as well as runtime ones, because a tag typed against a class keeps the dependency
  while erasing the import that would show it.
- **Implementation module** — the implementation, its layer, and its layer spec, together. The
  spec is three lines stating what the layer needs and provides, and it belongs with the layer
  it describes: one file to read, and no second description to drift from.
- **Combined** — a small subsystem whose interface is a tag or two states them alongside the
  implementation rather than in a file of its own.

Each subsystem exports one `specs(options)` returning its own specs; `Host` concatenates the four.
`clientServiceSpecs` becomes that concatenation instead of a hand-maintained list of sixty names:
`host/specs.ts` is 60 lines and defines no spec of its own, where `layer-specs.ts` was 813 and
defined all of them.

Each subsystem also declares the options it reads rather than taking the stack's whole bag —
`Mesh.Options` is six fields, not twenty-odd — so a spec can move into a subsystem without that
subsystem depending upward on the host that composes it.

## Specs over layers this package does not own

Nine of the sixty specs wrap a layer from another package — `SqliteKeyringLayer`,
`HypercoreFactoryLayer`, `HypercoreStoreLayer`, `RpcRouter.layer`, the two echo-host
replicators, the edge clients, the signal manager and the transport factory. There is no local
module to move them next to, so each subsystem keeps one `bindings.ts` for the external layers
it pulls into the stack. That is a different thing from a spec over a local layer and is worth
keeping visibly separate: `bindings.ts` is the subsystem's dependency on the wider monorepo,
and everything else is the subsystem describing itself.
