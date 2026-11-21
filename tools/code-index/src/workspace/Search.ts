//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Effect from 'effect/Effect';
import * as Ref from 'effect/Ref';

import type * as Store from '../Store.ts';
import * as Protocol from './Protocol.ts';
import * as Tree from './Tree.ts';

/**
 * Cmd+P: packages, files and declarations by name. It answers what exists, not where the tree shows
 * it — that is `Tree.locate`, asked for the one hit the user picks.
 *
 * The names live in memory: one pass over the index builds the list, which is rebuilt after every
 * index pass while the previous list keeps answering, so a keystroke is a scan of an array rather
 * than a query over every name in the store.
 */

// Namespaces are left out: each repeats its module, which is found by file name.
const SYMBOLS = `${Tree.DEUS}
SELECT DISTINCT ?symbol ?name ?kind ?canonical ?public ?packageName ?origin ?realKind ?path WHERE {
  ?symbol a deus:Symbol ; deus:exported true ; deus:name ?name ; deus:kind ?kind .
  FILTER(?kind != "namespace")
  ?file deus:declares ?symbol ; deus:path ?path .
  OPTIONAL { ?symbol deus:canonicalName ?canonical }
  OPTIONAL { ?symbol deus:packagePublic ?public }
  OPTIONAL { ?symbol deus:aliasOf ?origin }
  OPTIONAL { ?symbol deus:resolvesTo ?real . ?real deus:kind ?realKind }
  OPTIONAL { ?file deus:inPackage ?pkg . ?pkg deus:name ?packageName }
}`;

const FILES = `${Tree.DEUS}
SELECT DISTINCT ?file ?path ?packageName WHERE {
  ?file a deus:File ; deus:path ?path ; deus:language "typescript" .
  OPTIONAL { ?file deus:inPackage ?pkg . ?pkg deus:name ?packageName }
}`;

const PACKAGES = `${Tree.DEUS}
SELECT DISTINCT ?pkg ?name ?path WHERE { ?pkg a deus:Package ; deus:name ?name ; deus:packagePath ?path . FILTER(?path != "") }`;

/** One searchable name: what a hit shows, and the lowercase strings a query is matched against. */
type Entry = {
  readonly hit: Protocol.SearchHit;
  /** Lowercase forms the query may match: the bare name, and the canonical `Module.Noun` when it has one. */
  readonly keys: readonly string[];
  /** Published by its package (`packagePublic`), which ranks it ahead of an internal name. */
  readonly published: boolean;
};

const MAX_HITS = 50;

const fileName = (path: string): string => path.split('/').at(-1) ?? path;

/**
 * Whether a named re-export introduces a name of its own. `export { x } from` repeats `x`, found under
 * its declaration; `export { x as Y } from` makes `Y` searchable only through the re-export.
 */
const renames = (row: Store.Binding): boolean => row.origin === undefined || !row.origin.endsWith(`#${row.name}`);

/** Every searchable name in the index, built in one pass. */
const build = (store: Store.Api): Effect.Effect<readonly Entry[], Store.StoreError> =>
  Effect.gen(function* () {
    const [symbols, files, packages] = yield* Effect.all(
      [store.select(SYMBOLS), store.select(FILES), store.select(PACKAGES)],
      { concurrency: 'unbounded' },
    );
    const entries = new Map<string, Entry>();
    for (const row of packages) {
      entries.set(row.pkg, {
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
        keys: [row.name.toLowerCase()],
        published: true,
      });
    }
    for (const row of files) {
      entries.set(row.file, {
        hit: new Protocol.SearchHit({
          node: new Protocol.TreeNode({
            id: `${Tree.MODULE}${row.file}`,
            label: fileName(row.path),
            kind: 'file',
            branch: true,
          }),
          description: row.packageName ?? row.path,
        }),
        keys: [fileName(row.path).toLowerCase()],
        published: false,
      });
    }
    // A symbol comes back once per graph and optional fact; the first row for it wins.
    for (const row of symbols) {
      if (entries.has(row.symbol) || (row.kind === 'reexport' && !renames(row))) {
        continue;
      }
      const label = row.canonical ?? row.name;
      entries.set(row.symbol, {
        hit: new Protocol.SearchHit({
          node: new Protocol.TreeNode({
            id: `${Tree.SYMBOL}${row.symbol}`,
            label,
            kind: 'symbol',
            branch: false,
            detail: row.kind === 'reexport' ? (row.realKind ?? 'variable') : row.kind,
          }),
          description: row.packageName ?? row.path,
        }),
        keys: [...new Set([row.name.toLowerCase(), label.toLowerCase()])],
        published: row.public === 'true',
      });
    }
    return [...entries.values()];
  });

/** Exact, then prefix, then substring, on whichever key matches best; published first, then shorter. */
const rank = (entry: Entry, needle: string): number | undefined => {
  let tier: number | undefined;
  for (const key of entry.keys) {
    const match = key === needle ? 0 : key.startsWith(needle) ? 1 : key.includes(needle) ? 2 : undefined;
    if (match !== undefined && (tier === undefined || match < tier)) {
      tier = match;
    }
  }
  return tier === undefined ? undefined : tier * 10_000 + (entry.published ? 0 : 5_000) + entry.hit.node.label.length;
};

export const make = (store: Store.Api) =>
  Effect.gen(function* () {
    const current = yield* Ref.make<readonly Entry[] | undefined>(undefined);
    // The first search waits for the first build; later ones never wait, since a rebuild swaps in when done.
    const first = yield* Effect.cached(build(store).pipe(Effect.tap((entries) => Ref.set(current, entries))));

    /** Rebuilds the names after an index pass; the old list answers until the new one is ready. */
    const refresh = build(store).pipe(Effect.flatMap((entries) => Ref.set(current, entries)));

    const search = (query: string): Effect.Effect<Protocol.SearchHit[], Store.StoreError> =>
      Effect.gen(function* () {
        const needle = query.trim().toLowerCase();
        if (needle.length === 0) {
          return [];
        }
        const entries = (yield* Ref.get(current)) ?? (yield* first);
        const ranked: { readonly rank: number; readonly hit: Protocol.SearchHit }[] = [];
        for (const entry of entries) {
          const score = rank(entry, needle);
          if (score !== undefined) {
            ranked.push({ rank: score, hit: entry.hit });
          }
        }
        return ranked
          .toSorted((left, right) => left.rank - right.rank)
          .slice(0, MAX_HITS)
          .map(({ hit }) => hit);
      });

    return { search, refresh, warm: first };
  });
