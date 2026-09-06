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
  SELECT ?to WHERE { <https://dxos.org/deus/file/packages%2Fcommon%2Flog%2Fsrc%2Findex.ts> deus:imports+ ?t .
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
sole capabilities are four namespaces bridged over stdio: `rdf` (SPARQL over this index), `storage`
(per-project memory), `display` (the only channel to the screen — Mermaid, tables, markdown) and
`print` (the model's own return channel). The tool's documentation *is*
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

Tests run on Node under vitest (the CLI runs on Bun; the SQLite driver and the worker platform are
chosen from the ambient runtime). The sandbox tests spawn the real child process and skip where Bun
is absent:

```bash
moon run code-index:test
```

The store is single-writer (LevelDB), so `serve` and any other `code-index` command cannot run at
the same time.
