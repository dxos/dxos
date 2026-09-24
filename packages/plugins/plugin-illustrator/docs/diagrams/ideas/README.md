# Diagram ideas

Four architecture diagrams, drawn from the code (every node has a `%% ref`) and revised against the
architecture rules in `@dxos/diagram`'s `Architecture.RULES`. They live outside the corpus, so neither
`render-diagrams` nor the corpus snapshot picks them up; render or grade one by passing its path:

```bash
moon run plugin-illustrator:render-diagrams -- $PWD/docs/diagrams/ideas/echo.mmd
moon run plugin-illustrator:judge-diagrams -- $PWD/docs/diagrams/ideas/echo.mmd   # needs TYPESAFE_API_KEY
```

What each rule changed in the first drafts:

| Diagram           | Rule                                                        | Change                                                                                                                                             |
| ----------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `echo`            | `no-pointless-indirection`                                  | Dropped the proxy handler and `DocHandleProxy` relays, and `HypergraphImpl`, which only constructs the query context.                              |
| `echo`            | `state-owned-once`                                          | Each store's owner is named on its edge: `AutomergeHost` owns doc chunks, `IndexEngine` the index, `FeedStore` the blocks.                         |
| `echo`            | `public-surface-only`                                       | Client-to-host edges land only on `DataService` and `QueryService`, the RPC seams.                                                                 |
| `compute`         | `bounded-live-state`                                        | Added the dispatcher's capped run log (`MAX_TRACKED_INVOCATIONS`), the one bounded collection on the path.                                         |
| `compute`         | `no-pointless-indirection`                                  | Dropped `TriggerMonitor`, which only merges two atoms, and the dispatcher's reach through `ProcessManager.operationHandlerSet`.                     |
| `client-services` | `one-mechanism-per-concern`                                 | Proxies talk to one `ServicesProvider`; the two transports hang off it instead of each proxy wiring both.                                          |
| `client-services` | `no-pointless-indirection`                                  | Dropped the `devices` and `network` services, which only forward to their managers.                                                                |
| `process`         | `bounded-live-state`                                        | The live table's owner is labelled `owns, no cap`: `ProcessManager.#handles` has no limit and keeps finished handles until shutdown.               |
| `process`         | `no-pointless-indirection`                                  | Dropped `ProcessMonitor`, `DormantHandle` and `EdgeProcessManager`, which only merge, view or wire.                                                 |
| all               | `dependency-direction`                                      | Groups stack in dependency order. The two real back edges stay visible: `ProcessOpInvoker → ProcessManager` and `IdentityManager → EchoHost`.      |

Findings the diagrams surface but do not fix, each a candidate issue:

- `ProcessManager.#handles` and `ProcessOperationInvoker`'s `fiberCache` grow for the whole session.
- `echo-client` imports `QueryPlanner` and filters from `@dxos/echo-host`, so the query engine runs on both tiers.
- `@dxos/client-protocol` imports `@dxos/echo-client` and `@dxos/worker-framework`, above it in the stack.
