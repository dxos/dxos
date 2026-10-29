# mdl-language-server

A language server for DEUS `.mdl` specs. VS Code (`tools/vscode-mdl`) and Zed (`tools/zed-mdl`) both run it, so
the two editors show the same thing. It reuses the deus parsing and lint code (`@dxos/deus/parse`,
`@dxos/deus/review`, `@dxos/deus/spec-index`) that Composer's spec viewer runs, so it reports what the viewer
reports.

## What it serves

| LSP feature      | What it shows                                                                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagnostics      | The deus lint (block types, decision attribution, nested headers, `mdl/ref` and `mdl/uses` against the workspace's spec index), `github:` keys whose file or symbol is not in the checkout, and in a `.review.mdl`, verdicts with no known status or for an item the spec does not declare. |
| Completion       | Block types on a fence's header line (core types plus the `## Extensions` table), field names in a block body, spec ids after `uses`, a spec's items after `<id>#`, and verdict ids and statuses in a review. |
| Go to definition | A `github:` key opens the file at the symbol, `<spec id>#<item>` and `uses`/`dependsOn` ids open the other spec at the item, and an item id (`[F-1.2]`, `affects: [F-1]`) jumps to its declaration. In a review, a verdict id opens the item in the spec. |
| Document links   | The same keys and references, plus relative markdown links; a key into another repository links to GitHub.                                                                                             |
| Hover            | A key shows the declaration it names (the viewer's snippet card), a spec reference the other spec's block, and a reviewed item's line its verdict, note, walkthrough and the code and tests it cites.    |
| Code lenses      | The review's chips above each reviewed item: status, `</> symbol` code and test chips that open the code, and `no code` / `tested` / `not tested`. Lenses run the client command `mdl.open(uri, line)`. |
| Inlay hints      | The same chips at the end of the declaration line, with each code chip linked to its file.                                                                                                            |
| Document symbols | An outline of headings, the blocks under each, and each block's `req` items.                                                                                                                          |

The review is the `<SPEC>.review.mdl` beside the spec (see the `spec-review` skill). The server also answers the
custom request `mdl/verdictLines` (`{ uri }` → `{ line, status }[]`), which the VS Code client uses to colour the
margin, and sends `mdl/reviewChanged` when a review changes.

The workspace root is the editor's workspace folder. The server indexes every `.mdl` file git knows there (or every
one under it, outside git), and reads `remote.origin.url` to tell which `github:` keys name local files.

## Build and run

```bash
moon run mdl-language-server:bundle     # -> dist/server.cjs, one file with no node_modules
node tools/mdl-language-server/dist/server.cjs --stdio
```

The bundle reads `@dxos/deus` from its sources, so it needs no package build. Point any LSP client at
`node dist/server.cjs --stdio`.

## Tests

```bash
moon run mdl-language-server:test
```

`src/features.test.ts` runs each feature over an in-memory workspace (`src/testing/fixture.ts`).
`src/server.test.ts` starts the server on a stream pair over a temporary checkout and talks JSON-RPC to it.
