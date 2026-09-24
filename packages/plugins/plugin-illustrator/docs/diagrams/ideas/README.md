# Diagram ideas

Four architecture diagrams, drawn from the code (every node has a `%% ref`) and revised against the
architecture rules in `@dxos/diagram`'s `Architecture.RULES`. They live outside the corpus, so neither
`render-diagrams` nor the corpus snapshot picks them up; render or grade one by passing its absolute
path, here from the repository root:

```bash
moon run plugin-illustrator:render-diagrams -- $PWD/packages/plugins/plugin-illustrator/docs/diagrams/ideas/echo.mmd
moon run plugin-illustrator:judge-diagrams -- $PWD/packages/plugins/plugin-illustrator/docs/diagrams/ideas/echo.mmd  # needs TYPESAFE_API_KEY
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

System One's verdicts (`judge-diagrams`, one batched call per diagram), first draft → revised:

| Rule                        | ECHO        | compute     | client services | process     |
| --------------------------- | ----------- | ----------- | --------------- | ----------- |
| `dependency-direction`      | 0.25 → 0.55 | 0.12 → 0.17 | 0.58 → 0.48     | 0.16 → 0.19 |
| `state-owned-once`          | 0.45 → 0.81 | 0.51 → 0.59 | 0.50 → 0.64     | 0.64 → 0.51 |
| `one-mechanism-per-concern` | 0.59 → 0.73 | 0.43 → 0.64 | 0.50 → 0.63     | 0.33 → 0.24 |
| `no-pointless-indirection`  | 0.59 → 0.71 | 0.70 → 0.69 | 0.48 → 0.51     | 0.54 → 0.54 |
| `public-surface-only`       | 0.42 → 0.60 | 0.50 → 0.52 | 0.66 → 0.71     | 0.74 → 0.77 |
| `bounded-live-state`        | 0.27 → 0.46 | 0.26 → 0.21 | 0.27 → 0.34     | 0.41 → 0.24 |

The judge grades the architecture a diagram shows, so a low score after revision is a finding about
the code rather than about the drawing. Re-judging the same diagram moves each score by about 0.05.
Deleting only `ProcessManager → ProcOpInvoker` from `process` lifts `dependency-direction` from 0.15
to 0.47 and leaves the other rules unchanged; the edge stays because the cycle is real.

Findings the diagrams surface but do not fix, each a candidate issue:

- `ProcessManager.#handles` and `ProcessOperationInvoker`'s `fiberCache` grow for the whole session
  (`bounded-live-state` 0.24).
- `ProcessManager` and `ProcessOperationInvoker` depend on each other (`dependency-direction` 0.15–0.19).
- Local and EDGE process managers are parallel services merged only by their callers
  (`one-mechanism-per-concern` 0.24).
- `echo-client` imports `QueryPlanner` and filters from `@dxos/echo-host`, so the query engine runs on both tiers.
- `@dxos/client-protocol` imports `@dxos/echo-client` and `@dxos/worker-framework`, above it in the stack.

## Letting System One see the layout

System One reads structured input, not images, so the judge above sees the graph and nothing of how the
diagram is drawn. `View` in `@dxos/diagram` renders the laid-out scene as text: `coordinates` (positions
in grid cells), `ascii` (a character-grid drawing) and `rows` (boxes in reading order, which way each
arrow runs, and which arrows cross). `eval-layout-views` checks each rendering two ways, on the 7 corpus
diagrams, these 4 and their 4 first drafts: layout questions whose answers come from the geometry (is X
above Y, do any lines cross, which way do the arrows run), and the six rules against a reference grader,
Sonnet, that saw only the rendered PNG.

| Jev input                | Layout accuracy | Crossings | Rules: mean abs. difference from reference, r |
| ------------------------ | --------------- | --------- | --------------------------------------------- |
| Sonnet, from the image   | 97%             | 93%       | —                                             |
| graph only               | 55%             | 14%       | 0.18, 0.35                                    |
| `coordinates`            | 87%             | 79%       | 0.17, 0.41                                    |
| `ascii`                  | 81%             | 21%       | 0.17, 0.38                                    |
| `rows`                   | 88%             | 100%      | 0.19, 0.38                                    |
| `ascii` + `rows`         | 94%             | 100%      | 0.18, 0.37                                    |
| `coordinates` + `rows`   | 92%             | 100%      | 0.18, 0.39                                    |

- With the graph alone, Jev guesses about layout (55%, near chance). With `ascii` plus `rows` it reads the
  drawing almost as well as Sonnet does from the picture: 94% against 97%.
- Crossings are the one thing a text drawing does not convey: a `┼` in the ASCII grid is also where a
  shared port or a trunk meets. Stating them in `rows` took crossings from 21% to 100%.
- "Which box is nearest the top-left corner" stays at 36–50% under every rendering, so Jev compares
  positions pairwise well but does not find an extreme.
- The rules barely move. Agreement with the reference stays within the gap between two identical
  graph-only runs (0.18, r 0.34–0.35), because the rules judge what the diagram says, not how it is laid
  out. Only `dependency-direction` gains (r 0.62–0.68 to 0.72–0.75 with coordinates or ASCII): that rule
  asks whether dependencies point down the stack, which the drawing shows. The two graders disagree most
  on `state-owned-once` and `bounded-live-state`, where r is negative. That is a difference in reading
  the content, which no layout rendering fixes.

So `layout` in the judge's input is worth sending for rules about placement, such as layering, flow
direction, grouping and crossings, and not for rules about content.

```bash
moon run plugin-illustrator:eval-layout-views -- --questions /abs/questions.json <diagrams…>   # for the reference grader
moon run plugin-illustrator:eval-layout-views -- --reference /abs/answers.json <diagrams…>     # needs TYPESAFE_API_KEY
```
