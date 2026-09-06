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

Indexing ends by rerunning the N3 rules (`rules/example.n3`, or `--rules F`) over the whole graph and
replacing `graph:derived` with the result, so a conclusion never outlives the fact that entailed it.
Reachability is **not** among those rules — `deus:imports+` walks the import graph as a query, in a
fraction of the time a materialized closure costs; `rules/example.n3` explains when a rule is the
wrong tool. That phase is whole-graph and by
far the most expensive one, so it is skipped when a pass changed nothing, and `--no-reason` skips it
outright (leaving the derived graph as stale as the last pass that did run it).

Tests run on Node under vitest (the CLI runs on Bun; the SQLite driver and the worker platform are
chosen from the ambient runtime):

```bash
moon run code-index:test
```
