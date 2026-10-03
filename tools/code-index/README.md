# @dxos/code-index

Indexes a repository into a SQLite ledger and a persistent RDF quad store — one named graph per
file, speaking the DEUS code vocabulary. Query it with SPARQL or LDkit, extend it with N3 (EYE)
rules.

- [`design/ONTOLOGY.md`](./design/ONTOLOGY.md) — the vocabulary and document shape (source of truth).
- [`SPEC.mdl`](./SPEC.mdl) — modules, commit protocol, features and tests.

```bash
bun tools/code-index/bin/code-index.ts index          # incremental pass, closed by the reasoner
bun tools/code-index/bin/code-index.ts stats
bun tools/code-index/bin/code-index.ts files --lang typescript
bun tools/code-index/bin/code-index.ts query 'PREFIX deus: <https://dxos.org/vocab/deus#>
  SELECT ?from ?to WHERE { ?f deus:path ?from ; deus:imports ?t . ?t deus:path ?to } LIMIT 10'

# everything a file transitively imports — a property path, nothing materialized
bun tools/code-index/bin/code-index.ts query 'PREFIX deus: <https://dxos.org/vocab/deus#>
  SELECT ?to WHERE { <https://dxos.org/deus/file/packages/common/log/src/index.ts> deus:imports+ ?t .
                     ?t deus:path ?to }'
```

The store defaults to `<git root>/node_modules/.code-index`, so every command finds the same index
from anywhere in the repository. Each pass prints a phase breakdown
(`scan · parse · commit · reason · total`).

Indexing ends by rerunning the N3 rules — every `.n3` in the bundled `rules/` directory, in filename
order, or whatever `--rules <file|dir>` names — over the whole graph, replacing each reasoner's
derived graph with the result, so a conclusion never outlives the fact that entailed it.
Reachability is **not** among those rules — `deus:imports+` walks the import graph as a query, in a
fraction of the time a materialized closure costs; `rules/50-example.n3` explains when a rule is the
wrong tool. That phase is whole-graph and by
far the most expensive one, so it is skipped when a pass changed nothing, and `--no-reason` skips it
outright (leaving the derived graph as stale as the last pass that did run it).

## Reasoning about it in a browser

`code-index` with no subcommand starts a webserver — chat on the left, and beside it a canvas of
whatever the agent chose to show you.

```bash
bun tools/code-index/bin/code-index.ts                    # http://127.0.0.1:5599, gpt-oss:20b via local ollama
bun tools/code-index/bin/code-index.ts --provider anthropic
bun tools/code-index/bin/code-index.ts chat --prompt 'Which packages declare ECHO types?'
```

`chat` is the same session in the terminal — same log, same agent, same sandbox — which makes it the
cheapest way to exercise a turn without a browser. Anthropic needs `DX_ANTHROPIC_API_KEY` (or
`ANTHROPIC_API_KEY`) and is there for hosts that cannot run a 20B model locally.

**One tool.** The agent's only action is `exec`, which runs TypeScript in a Bun child process whose
sole capabilities are namespaces bridged over stdio: `rdf` (SPARQL over this index), `storage`
(per-project memory), `display` (the only channel to the screen — Mermaid, tables, markdown, force
graphs), `design` (scored subgraphs for design questions) and `print` (the model's own return channel). The tool's documentation *is*
[`src/workspace/sandbox/api.d.ts`](./src/workspace/sandbox/api.d.ts), so the surface cannot drift
from what the model is told. The isolation is process-level — fresh interpreter, scrubbed
environment, temporary cwd, wall-clock deadline — which bounds accidents rather than a hostile
snippet.

**A project is an append-only log.** Chat, canvas and title are folds over one `events` table
(`src/workspace/Fold.ts`, shared by the server and the browser), so a reload replays exactly what a
live session saw and there is no second copy to keep in step. The project id is in the URL
(`/p/<id>`); a bare load adopts the last one that browser opened.

**No build step.** Vite runs inside the server process in middleware mode and resolves `@dxos/*`
through the `source` condition, so the UI — Solid, with `@dxos/react-ui-thread` mounted as a React
island — is transformed from the working tree with nothing to rebuild first.

## Design questions

`code-index design "<prompt>"` answers a question like "how does the agent runtime wire its
services?" with a compact diagram, in three stages (`src/design/`):

1. **Explore** (recall) — a few hundred candidate _files_, each with a card (primary declaration,
   kind, package, doc, snippet, degree, why it was included), and typed edges: imports plus the
   framework relations (`providesService`, `implementsOperation`, `contributesCapability`, …) lifted
   from symbols to their files. `--explorer bfs` (default, no model) seeds by text match and walks a
   fixed relation set; `--explorer llm` lets a workspace-agent turn choose seeds and relations
   (`--provider anthropic --model claude-haiku-4-5-20251001`).
2. **Zoom** (precision) — System One judges each card, each relation kind and the grouping level, 16
   calls at a time, cached in `<store>/design-cache.jsonl` so a rerun bills nothing it already asked.
   Pruning keeps `--budget` nodes over `--threshold`, and a dropped node between two survivors becomes
   a relay edge. `--scorer baseline` scores by text match, degree and hop distance instead.
3. **Draw** — four compact variants (≲ 14 nodes, ≤ 3 groups, `%% ref` per node, no caption), each
   laid out by `MermaidEngine` and scored by the layout objective plus `Architecture.judge()` and
   `Aesthetics.judge()`; the best is written as `diagram.mmd` and `diagram.svg`. Layout runs in a Node
   child (`src/design/draw-main.ts`) because Bun cannot load ELK.

```bash
op run --env-file tools/code-index/design.env.tpl -- \
  bun tools/code-index/bin/code-index.ts design "how does the agent runtime wire its services?"
```

Every stage's JSON lands in `--out` (default `<store>/design/<slug>`). In the chat, the agent calls
`design.subgraph(prompt)` and shows the result with `display.graph(...)` — a force view where size and
opacity are relevance, groups collapse on click, a click opens a node's card, and the low-relevance
nodes are one click away. `moon run code-index:design-eval` measures all of it against the
hand-drawn diagrams in `plugin-illustrator/docs/diagrams`.

Tests run on Node under vitest (the CLI runs on Bun; the SQLite driver and the worker platform are
chosen from the ambient runtime). The sandbox tests spawn the real child process and skip where Bun
is absent:

```bash
moon run code-index:test
```

The store is single-writer (LevelDB), so `serve` and any other `code-index` command cannot run at
the same time.
