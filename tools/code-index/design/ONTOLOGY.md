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

| Thing      | IRI                                                       | Note                                   |
| ---------- | --------------------------------------------------------- | -------------------------------------- |
| File       | `file:` + `encodeURIComponent(<repo-relative path>)`      | Stable across revisions of the file.   |
| Symbol     | `<file IRI>` + `#` + `encodeURIComponent(<name>)`         | Scoped to its file.                    |
| File graph | `graph:` + `encodeURIComponent(<path>)` + `#` + `<mtime>` | Changes on every reindex — see Graphs. |

## Graphs

Every file owns one named graph, keyed by path **and** mtime. Nothing about a file is written to
the default graph, so reindexing a file is: write the new `<path>#<mtime>` graph, then drop the
previous one. The mtime in the key is what makes the swap safe — a partially written new graph is
never confused with the live one, because the live graph IRI is recorded in SQLite (`files.graph`)
and only advances when the write has completed. See `Store.putFileDocument` for the commit order.

Derived quads produced by reasoning are written to the default graph, never into a file graph, so
`clear`ing or reindexing a file never destroys them.

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

| Property         | Meaning                                                    |
| ---------------- | ---------------------------------------------------------- |
| `deus:dependsOn` | Transitive closure of `deus:imports` (`rules/imports.n3`). |

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
