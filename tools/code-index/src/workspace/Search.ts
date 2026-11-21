//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Effect from 'effect/Effect';

import type * as Store from '../Store.ts';
import * as Protocol from './Protocol.ts';
import * as Tree from './Tree.ts';

/**
 * Cmd+P: packages, files and declarations by name, over the whole index. It answers what exists,
 * not where the tree shows it — that is `Tree.locate`, asked for the one hit the user picks — so a
 * declaration nothing exports is found as readily as one every importer uses.
 */

/**
 * Names that start with the query, or merely contain it, as two bounded queries: a limit applies
 * before ranking, so one query over substrings would let a common fragment crowd the exact name out.
 */
const MATCH = {
  prefix: (variable: string, needle: string) => `STRSTARTS(LCASE(${variable}), ${Tree.literal(needle)})`,
  infix: (variable: string, needle: string) =>
    `CONTAINS(LCASE(${variable}), ${Tree.literal(needle)}) && !STRSTARTS(LCASE(${variable}), ${Tree.literal(needle)})`,
};

// Named re-exports and namespaces are left out: each repeats a declaration found under its own name.
// DISTINCT, since a symbol otherwise comes back once per graph and optional fact, and the limit would count those.
const symbolsQuery = (needle: string, match: keyof typeof MATCH) => `${Tree.DEUS}
SELECT DISTINCT ?symbol ?name ?kind ?canonical ?public ?path ?packageName WHERE {
  ?symbol a deus:Symbol ; deus:exported true ; deus:name ?name ; deus:kind ?kind .
  FILTER(?kind != "reexport" && ?kind != "namespace")
  FILTER(${MATCH[match]('?name', needle)})
  ?file deus:declares ?symbol ; deus:path ?path .
  OPTIONAL { ?symbol deus:canonicalName ?canonical }
  OPTIONAL { ?symbol deus:packagePublic ?public }
  OPTIONAL { ?file deus:inPackage ?pkg . ?pkg deus:name ?packageName }
} LIMIT 300`;

const filesQuery = (needle: string) => `${Tree.DEUS}
SELECT DISTINCT ?file ?path WHERE {
  ?file a deus:File ; deus:path ?path ; deus:language "typescript" .
  FILTER(CONTAINS(LCASE(REPLACE(?path, "^.*/", "")), ${Tree.literal(needle)}))
} LIMIT 200`;

const packagesQuery = (needle: string) => `${Tree.DEUS}
SELECT DISTINCT ?pkg ?name ?path WHERE {
  ?pkg a deus:Package ; deus:name ?name ; deus:packagePath ?path .
  FILTER(?path != "" && CONTAINS(LCASE(?name), ${Tree.literal(needle)}))
} LIMIT 100`;

/** Exact name, then prefix, then substring; within each, what a package publishes first, then shorter names. */
const rank = (name: string, needle: string, published: boolean): number => {
  const lower = name.toLowerCase();
  const tier = lower === needle ? 0 : lower.startsWith(needle) ? 1 : 2;
  return tier * 10_000 + (published ? 0 : 5_000) + name.length;
};

const MAX_HITS = 50;

const fileName = (path: string): string => path.split('/').at(-1) ?? path;

export const make = (store: Store.Api) => {
  const search = (query: string): Effect.Effect<Protocol.SearchHit[], Store.StoreError> =>
    Effect.gen(function* () {
      const needle = query.trim().toLowerCase();
      if (needle.length === 0) {
        return [];
      }
      const [packageRows, fileRows, prefixRows, infixRows] = yield* Effect.all(
        [
          store.select(packagesQuery(needle)),
          store.select(filesQuery(needle)),
          store.select(symbolsQuery(needle, 'prefix')),
          store.select(symbolsQuery(needle, 'infix')),
        ],
        { concurrency: 'unbounded' },
      );
      const symbolRows = [...prefixRows, ...infixRows];

      const packages = packageRows.map((row) => ({
        rank: rank(row.name, needle, true),
        hit: new Protocol.SearchHit({
          node: new Protocol.TreeNode({
            id: `${Tree.PACKAGE}${row.pkg}`,
            label: row.name,
            kind: 'package',
            branch: true,
            detail: fileName(row.path),
          }),
          description: row.path,
        }),
      }));

      const files = fileRows.map((row) => ({
        rank: rank(fileName(row.path), needle, false),
        hit: new Protocol.SearchHit({
          node: new Protocol.TreeNode({
            id: `${Tree.MODULE}${row.file}`,
            label: fileName(row.path),
            kind: 'file',
            branch: true,
          }),
          description: row.path,
        }),
      }));

      // A symbol can come back once per graph it sits in; one row per symbol.
      const symbols = [...new Map(symbolRows.map((row) => [row.symbol, row])).values()].map((row) => ({
        rank: rank(row.name, needle, row.public === 'true'),
        hit: new Protocol.SearchHit({
          node: new Protocol.TreeNode({
            id: `${Tree.SYMBOL}${row.symbol}`,
            label: row.name,
            kind: 'symbol',
            branch: false,
            detail: row.kind,
          }),
          description: [row.canonical ?? row.name, row.packageName ?? row.path].join(' · '),
        }),
      }));

      return [...packages, ...files, ...symbols]
        .toSorted((left, right) => left.rank - right.rank)
        .slice(0, MAX_HITS)
        .map(({ hit }) => hit);
    });

  return { search };
};
