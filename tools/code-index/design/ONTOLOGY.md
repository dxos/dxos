# DEUS code ontology

The source of truth for what `code-index` writes. The indexer emits JSON-LD documents shaped by
this document; `Store` upserts them verbatim. `src/Ontology.ts` is the executable mirror of what is
written here — change this file first, then the module.

## Namespaces

| Prefix   | IRI                                 |
| -------- | ----------------------------------- |
| `deus:`  | `https://dxos.org/vocab/deus#`      |
| `file:`  | `https://dxos.org/deus/file/`       |
| `graph:` | `https://dxos.org/deus/graph/`      |
| `xsd:`   | `http://www.w3.org/2001/XMLSchema#` |

Resource IRIs are derived, never invented:

| Thing         | IRI                                                       | Note                                        |
| ------------- | --------------------------------------------------------- | ------------------------------------------- |
| File          | `file:` + `encodeURIComponent(<repo-relative path>)`      | Stable across revisions of the file.        |
| Symbol        | `<file IRI>` + `#` + `encodeURIComponent(<name>)`         | Scoped to its file.                         |
| File graph    | `graph:` + `encodeURIComponent(<path>)` + `#` + `<mtime>` | Changes on every reindex — see Graphs.      |
| Derived graph | `graph:derived`                                           | The single home of everything rules entail. |

## Graphs

Every file owns one named graph, keyed by path **and** mtime. Nothing about a file is written to
the default graph, so reindexing a file is: write the new `<path>#<mtime>` graph, then drop the
previous one. The mtime in the key is what makes the swap safe — a partially written new graph is
never confused with the live one, because the live graph IRI is recorded in SQLite (`files.graph`)
and only advances when the write has completed. See `Store.putFileDocument` for the commit order.

Reasoning writes to one further graph, `graph:derived`, and never into a file graph. That graph is
**replaced wholesale** at the end of every indexing pass: conclusions are exactly what the current
facts entail, so a derived fact cannot outlive the import or file that entailed it. Reasoning also
reads only the file graphs — a previous pass's conclusions are never premises of the next one,
which would otherwise let a derivation keep itself alive.

## Classes

| Class         | Meaning                                                             |
| ------------- | ------------------------------------------------------------------- |
| `deus:File`   | One indexed file in the repository.                                 |
| `deus:Symbol` | A named declaration in a file (function, class, variable, type, …). |

## Properties

| Property             | Domain        | Range         | Meaning                                                                              |
| -------------------- | ------------- | ------------- | ------------------------------------------------------------------------------------ |
| `deus:path`          | `deus:File`   | `xsd:string`  | Repo-relative path, POSIX separators.                                                |
| `deus:language`      | `deus:File`   | `xsd:string`  | `typescript`, `javascript`, `json`, `markdown`, `other`.                             |
| `deus:size`          | `deus:File`   | `xsd:integer` | Bytes.                                                                               |
| `deus:mtime`         | `deus:File`   | `xsd:integer` | Modification time, epoch milliseconds — the incremental-indexing key.                |
| `deus:hash`          | `deus:File`   | `xsd:string`  | SHA-256 of the contents, hex.                                                        |
| `deus:imports`       | `deus:File`   | `deus:File`   | Resolved import edge (the specifier resolved to another indexed file).               |
| `deus:importsModule` | `deus:File`   | `xsd:string`  | Unresolved specifier, kept verbatim (bare package, virtual module, missing file).    |
| `deus:declares`      | `deus:File`   | `deus:Symbol` | A declaration the file introduces.                                                   |
| `deus:name`          | `deus:Symbol` | `xsd:string`  | Declared name.                                                                       |
| `deus:kind`          | `deus:Symbol` | `xsd:string`  | `function`, `class`, `variable`, `type`, `interface`, `enum`, `reexport`, `unknown`. |
| `deus:exported`      | `deus:Symbol` | `xsd:boolean` | Whether the declaration leaves the module.                                           |
| `deus:line`          | `deus:Symbol` | `xsd:integer` | 1-based line of the declaration.                                                     |
| `deus:parseError`    | `deus:File`   | `xsd:string`  | One message per parse diagnostic; present only on failure.                           |

### Derived — written by rules, never by the indexer

| Property               | Meaning                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `deus:importsTestFile` | A non-test file importing a test file (`rules/example.n3`). |

Reachability over `deus:imports` is deliberately **absent** from this list. A SPARQL property path
walks it lazily — `deus:imports+` answers "everything this file transitively imports" in ~0.2s over
a 15k-file index — where the equivalent closure rule cost 147s per pass and 123,692 stored quads for
the same answers. Do not add a rule for something a query already expresses: paths (`+`, `*`, `^`,
`|`) cover reachability, inverses and alternatives.

A rule set is only handed the facts whose predicates it names, so naming them keeps the phase cheap.

Derived quads live in `graph:derived` and are recomputed, never accumulated: an indexing pass that
changed something rebuilds that graph from scratch, and a pass that changed nothing leaves it as it
is. Note that deleting a file does not dirty the files that imported it, so an unchanged importer
keeps its `deus:imports` edge to the departed file until that importer is itself reindexed.

## JSON-LD document

One document per file, exactly this shape (`@context` is `Ontology.CONTEXT`):

```json
{
  "@context": { "deus": "https://dxos.org/vocab/deus#", "…": "…" },
  "@id": "https://dxos.org/deus/file/src%2Fa.ts",
  "@type": "File",
  "path": "src/a.ts",
  "language": "typescript",
  "size": 120,
  "mtime": 1730000000000,
  "hash": "9f86d0…",
  "imports": ["https://dxos.org/deus/file/src%2Fb.ts"],
  "importsModule": ["effect"],
  "declares": [
    {
      "@id": "https://dxos.org/deus/file/src%2Fa.ts#a",
      "@type": "Symbol",
      "name": "a",
      "kind": "variable",
      "exported": true,
      "line": 2
    }
  ]
}
```

Invariants:

1. `@id` is the file IRI and `path`/`mtime`/`hash` always accompany it — they are the join keys with
   the SQLite ledger.
2. `imports` holds IRIs of files that are themselves indexed; anything unresolved stays a literal in
   `importsModule`. A specifier is never recorded in both.
3. Symbols are nested nodes, so one document is the complete content of one file graph.
4. A document is never partial: a parse failure still produces the file node, with `parseError`
   entries and no `declares`.
