# Code Graph — design

## Goal

An article that shows part of the codebase as a graph, which the assistant can query and change. It is
an experiment with two layouts for the same graph: the illustrator's semantic engine and a
force-directed layout. It reuses the canvas and illustrator code the same way the projects plugin's
feature maps do.

## Pieces

| Piece              | Where                                                               | Job                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CodeGraph`        | `src/types/CodeGraph.ts`                                            | ECHO object: `nodes` (IRI, label, kind, package group, dragged position), `edges` (from, to, predicate), `layout`.                                                                      |
| Operations + skill | `src/types/CodeGraphOperation.ts`, `src/operations/`, `src/skills/` | `Query`, `Inspect` (read the index); `Read`, `AddFromQuery`, `AddNodes`, `AddNeighbors`, `Remove`, `SetLayout` (change a graph). The skill creates graphs with the space's `AddObject`. |
| Client             | `src/client/`                                                       | `fetch` to the same-origin `/api/code-index` route; responses decoded with Effect Schema.                                                                                               |
| Vite plugin        | `src/vite-plugin/` (`./vite-plugin` export)                         | Dev-server middleware that spawns `code-index mcp` and calls its read-only tools over stdio JSON-RPC.                                                                                   |
| Layouts            | `src/graph/Semantic.ts`                                             | Writes the graph as illustrator DSL and solves it with `SemanticEngine` (one restart).                                                                                                  |
| Canvas             | `src/components/CodeGraphCanvas/`                                   | `react-ui-canvas/scene`'s dynamic projection, as in `plugin-projects`' `FeatureCanvas`.                                                                                                 |
| Drawing            | `src/components/CodeGraphDiagram/`                                  | The illustrator's `SceneSvg` for the full drawing (frames and routed arrows).                                                                                                           |

## Why a vite route, and why MCP

The index is an oxigraph store behind a Rust Node-API addon, and only one process may open it. The
browser cannot open it, and the `code-index` web server has no plain SPARQL route. The MCP server
already exposes exactly the read-only verbs needed (`query`, `describe`, …). The dev server runs it as a
child process, so the vite process does not load the addon, and the route is same-origin, so no CORS
is needed. A JSON content type forces a CORS preflight that the route never answers, and only loopback
callers are accepted (the same checks as `plugin-dev-shell`'s shell route). Under `tauri dev` the webview
loads the same dev server, so the route works there too.

## Layouts and reuse

One canvas serves three of the four layouts. The dynamic projection takes a `GraphModel` and an
`Overlay` of positions:

- **force** and **rank**: the projection's own `arrange` (`force` is d3-force snapped to slots;
  `crossings` orders rank rows to cut crossings). The overlay holds only boxes the user dragged.
- **illustrator**: `Semantic.layout` writes the DSL (`node nI "label" ref="<iri>"`, `edge a depends-on b`,
  one `group` frame per package when there are 2–6 packages), solves it, and reads back each box's centre.
  The centres become the overlay, so the canvas draws the illustrator's placement. Box size and pitch are
  shared constants, so the positions match the canvas boxes 1:1.
- **diagram**: the same solution's world objects rendered by `SceneSvg`, read-only, with the engine's
  package frames and gutter-routed arrows that the canvas does not draw.

Dragging a box writes its position to the node. In illustrator mode only the positions that differ from
the computed layout are saved, so the layout still owns every box the user did not move.

## Limits

- The semantic engine is synchronous and runs on the main thread after the change paints. It is fast
  for tens of boxes; large graphs should use `force`.
- The illustrator draws frames for 2–6 packages only, because the engine keeps more groups poorly.
- No production path: a deployed Composer has no dev server. A Tauri-native path (a sidecar or a Rust
  command over the same store) would be the next step.

## Single commands

A command bar on the article (a floating button, or `/`) runs one short command — "clear the graph", "show me
the ECHO package exports", "what depends on the identity service" — without the chat assistant. It is built for
latency: one model round trip in the common case.

| Piece     | Where                                                    | Job                                                                                      |
| --------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Loop      | `src/command/Command.ts`                                 | Turns of Claude Haiku answering a `Step` (actions + one sentence) with `generateObject`. |
| Filter    | `src/command/Filter.ts`                                  | The remove filter: `*`, `kind:<kind>`, `/regex/`, text; `\|` for alternatives.           |
| Budget    | `src/command/Budget.ts`                                  | Caps a command at 40 new boxes and summarises the rest as a trailer.                     |
| Operation | `RunCommand`, `src/operations/run-command.ts`            | Loads the graph and runs the loop with the AI service's models.                          |
| Bar       | `src/components/CommandBar/`, `CodeGraphArticle`         | The field, the outcome line and the trailer; the microphone toggle.                      |
| Speech    | `useSpeechCommand`, `@dxos/plugin-transcription/Whistle` | Whistle on the device; each pause ends a spoken command.                                 |

Before the first turn, `src/command/Grounding.ts` looks up what the command names: packages by name, bare name or
path directory (from a package list loaded once per page, which the article requests on open), and exported symbols
by exact `deus:canonicalName` or `deus:name` (`Identity.Service`, `Obj.update`). The model gets the matches as exact
IRIs, so it does not guess names with `CONTAINS`. The lookup takes about 10 ms on a warm index and is skipped after
1.5 s.

Each turn the model sees the graph (boxes in `pkg:`/`file:` shorthand, up to 120 listed), the matches and the
command, and may only `add` the rows of a SPARQL SELECT or `remove` boxes by a filter. After a turn:

1. no actions → stop;
2. an action failed or a query returned no rows → another turn, with the error, without asking;
3. the turn only removed boxes → stop;
4. otherwise the decision model (`Model.defaultDecisionModel`: Cloudflare's Clef on Workers AI unless the TypeSafe
   plugin's settings pick another) answers "is the command done?" from the command, the last turn and the first 30
   boxes, and the loop stops at ≥ 0.5. Clef answers in about 0.3 s. Without a decision model the loop stops here.

The plugin depends on the TypeSafe plugin, which serves every decision model, so enabling Code Graph enables it.

At most three turns. A query may return up to 1000 rows; the first boxes that fit the 40-box budget (and the
300-box graph cap) are drawn, and the rest become the trailer ("+57 not shown: 57 files in packages/sdk/client-services
(40), …, e.g. …"), which the bar shows and the next turn reads.

Every step (lookup, model call, add, remove, judge) is timed and returned as `trace` on the operation's output, and
logged as `code graph command step`. The bar's verbose toggle lists the steps of the last command with their times,
token or row counts, and the SPARQL or filter each ran.

Where the time goes: a model call through EDGE takes about 2–3 s even for a short answer, and is most of every
command; a warm index answers in milliseconds. A command that needs a second turn takes twice as long, so the prompt
and the lookup aim at one turn.

The live tests in `src/command/Command.e2e.test.ts` run these commands headless against the real index and models.
