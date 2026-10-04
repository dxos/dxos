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
(`scan · parse · commit · reason · summary · total`). `parse` and `commit` are summed across the
concurrent worker batches, so on a wide pool `parse` exceeds `total`; `summary` records the counts
`mcp`'s `vocabulary` and `stats` read (see below).

Indexing ends by rerunning the N3 rules — every `.n3` in the bundled `rules/` directory, in filename
order, or whatever `--rules <file|dir>` names — over the whole graph, replacing each reasoner's
derived graph with the result, so a conclusion never outlives the fact that entailed it.
Reachability is **not** among those rules — `deus:imports+` walks the import graph as a query, in a
fraction of the time a materialized closure costs; `rules/50-example.n3` explains when a rule is the
wrong tool. That phase is whole-graph and by
far the most expensive one, so it is skipped when the store records that the same rules already ran
over the facts it holds now. `--no-reason` skips it outright, leaving the derived graph stale until
the next pass that reasons, which catches up even if no file changed in between.

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

**The index stays current.** The server holds the store, so it indexes on its own: an incremental
pass at startup, then one after every burst of changes to a directory the index covers
(`src/Watch.ts`). `--no-watch` serves the store as it is.

**No build step.** Vite runs inside the server process in middleware mode and resolves `@dxos/*`
through the `source` condition, so the UI — Solid, with `@dxos/react-ui-thread` mounted as a React
island — is transformed from the working tree with nothing to rebuild first.

## Querying it from an MCP client

`code-index mcp` serves the index to an MCP client (Claude Code, Claude Desktop) over stdio. It is
read-only: it opens an existing store, never indexes or writes, and takes the same `--root` /
`--store` flags as every other command. A store records the backend that wrote it, which the server
adopts; a `CODE_INDEX_BACKEND` naming the other one is refused. Index first, then register it:

```bash
bun tools/code-index/bin/code-index.ts index
claude mcp add code-index -- bun tools/code-index/bin/code-index.ts mcp
```

Or, for everyone working in a checkout, in that project's `.mcp.json` (this repository does not ship
one — add it locally):

```json
{
  "mcpServers": {
    "code-index": {
      "command": "bun",
      "args": ["tools/code-index/bin/code-index.ts", "mcp"]
    }
  }
}
```

| Tool         | Parameters | What it answers |
| ------------ | ---------- | --------------- |
| `vocabulary` | — | Every documented `deus:` class and predicate with its meaning, subject class, range and quad count (0 when this graph never states it), plus undocumented terms the graph contains and the namespace prefixes. Start here. |
| `describe`   | `target`, `limit` | One resource's outgoing triples and incoming triples (spread across predicates, with `incomingCounts` per predicate). `target` is an IRI, a file path or its tail, a package name, a symbol or canonical name (`Operation.make`), an operation key, an ECHO typename, a plugin id, a spec id, or a module member as imported (`effect/Layer#effect`). Exact matches outrank partial ones and package-public symbols rank first; ties return up to 20 `candidates` with `candidatesTotal`, and a miss returns a `hint`. |
| `usages`     | `symbol`, `kind`, `includeTests`, `limit` | Every symbol using a declaration, through `export *` barrels, named re-exports, namespaces (`Order.natural`) and bare specifiers, grouped by package: each file with its role (`impl`, `test`, `story`), the symbols using it and `via` (`direct` or `barrel`), plus `reexportedBy` and `total` counts that the file `limit` (default 500, at most 5000) never hides. `kind` narrows to `api` or `impl` uses; `includeTests: false` drops test files. An alias resolves to its declaration; several declarations return `candidates`. |
| `query`      | `sparql`, `limit`, `timeoutMs` | A SPARQL SELECT as `{ vars, rows }`, capped at `limit` (default 200, at most 2000) with `truncated` reported. |
| `ask`        | `sparql`, `timeoutMs` | A SPARQL ASK, as a boolean. |
| `files`      | `prefix`, `language`, `limit` | Indexed files, filtered by path prefix and language. |
| `stats`      | — | Files, quads and per-reasoner derived counts, and the backend in use. |
| `design`     | `prompt`, `budget`, `threshold` | The files that answer a design question and how they connect, with a mermaid draft (see Design questions). Explored by query and selected when the server has an Anthropic key, by the text-seeded walk otherwise; scored by System One when it has `TYPESAFE_API_KEY`, by a text/degree baseline otherwise. |

`query` and `ask` declare any known prefix (`deus:`, `file:`, `pkg:`, `module:`, `graph:`, `rdf:`,
`rdfs:`, `xsd:`, …) a query uses without declaring, and say so in `prefixesInjected`; name a `deus:`
term the vocabulary lacks in `warnings`, with the closest known terms; and pass the engine's parse
or evaluation message through on failure. Each query is cancelled after `timeoutMs` (default 30 s,
at most 120 s) with an error suggesting how to narrow it. On the native backend the query runs on a
libuv thread and cancellation reaches the evaluator, which stops at its next quad read; on the JS
backend Comunica cannot be interrupted mid-join, so the abandoned evaluation runs to completion in
the background while the server keeps answering (and closing the store waits for it).

`vocabulary` and `stats` read counts the last `code-index index` pass recorded in SQLite `meta`;
counting the graph itself is a scan of every quad (10–15 s on this repository). When the store has
changed since — a `serve` watcher's passes skip the summary — the first call counts live and the
result is kept for the life of the process.

stdout belongs to the protocol; the startup line and every log go to stderr. The store is
single-writer and neither backend can be read beside a live writer — LevelDB has no read-only mode,
and oxigraph documents a read-only RocksDB open next to a writer as undefined behaviour — so `mcp`
cannot run while `serve`, `index` or another `mcp` holds the store. It fails at startup naming the
process that does (its PID and which command it is); stop it, or point `--store` at a copy of the
store directory.

## Design questions

`code-index design "<prompt>"` answers a question like "how does the agent runtime wire its
services?" with a compact diagram, in three stages (`src/design/`):

1. **Explore** (recall) — a few hundred candidate _files_, each with a card (primary declaration,
   kind, package, doc, snippet, degree, why it was included), and typed edges: imports plus the
   framework relations (`providesService`, `implementsOperation`, `contributesCapability`, …) lifted
   from symbols to their files. `--explorer query` (default) has a small model (Haiku with an Anthropic
   key, else the Ollama default; `--provider`/`--model` override) run up to `--max-queries` SPARQL
   queries over the documented vocabulary, bounded in rows and time, with failed queries fed back;
   every file any query returns, plus the text-match seeds, is unioned with its provenance, and files
   linking two of them join as bridges. `--explorer bfs` (the previous default, no model) seeds by
   text match and walks a fixed relation set; `--explorer llm` lets a workspace-agent turn choose seeds
   and relations for that walk.
2. **Zoom** (precision) — System One judges each card, each relation kind and the grouping level, 16
   calls at a time, cached in `<store>/design-cache.jsonl` so a rerun bills nothing it already asked.
   After the query explorer, selection (`src/design/Select.ts`) hides tests, stories, generated,
   `internal/` and file-local files unless the prompt asks for them, scales each file's relevance by
   its degree in the candidates and in the index, and grows the kept set outward from the best file
   so it stays connected. After the other explorers, pruning keeps `--budget` nodes over
   `--threshold`. Either way a dropped node between two survivors becomes a relay edge.
   `--scorer baseline` scores by text match, degree and hop distance instead.
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

The store is single-writer (LevelDB or RocksDB), so `serve` and any other `code-index` command,
`mcp` included, cannot run at the same time.
