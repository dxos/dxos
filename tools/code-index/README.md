# @dxos/code-index

Indexes a repository into a SQLite ledger and a persistent RDF quad store — one named graph per
file, speaking the DEUS code vocabulary. Query it with SPARQL or LDkit, extend it with N3 (EYE)
rules.

- [`design/ONTOLOGY.md`](./design/ONTOLOGY.md) — the vocabulary and document shape (source of truth).
- [`SPEC.mdl`](./SPEC.mdl) — modules, commit protocol, features and tests.

```bash
bun tools/code-index/bin/code-index.ts index          # incremental pass over the current repo
bun tools/code-index/bin/code-index.ts stats
bun tools/code-index/bin/code-index.ts files --lang typescript
bun tools/code-index/bin/code-index.ts reason --materialize
bun tools/code-index/bin/code-index.ts query 'PREFIX deus: <https://dxos.org/vocab/deus#>
  SELECT ?from ?to WHERE { ?f deus:path ?from ; deus:imports ?t . ?t deus:path ?to } LIMIT 10'
```

The store defaults to `<git root>/node_modules/.code-index`, so every command finds the same index
from anywhere in the repository.

Tests run on Node under vitest (the CLI runs on Bun; the SQLite driver and the worker platform are
chosen from the ambient runtime):

```bash
moon run code-index:test
```
