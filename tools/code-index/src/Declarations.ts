//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Effect from 'effect/Effect';

import * as Ontology from './Ontology.ts';
import type * as Store from './Store.ts';

/**
 * Where a name is declared, best first. A bare name routinely has several declarations — the real
 * one plus a test double (`const proxyFetchLegacy = vi.fn()`) or a story's local — and the first row
 * of an unordered query is whichever the evaluator met first, so the ranking is the point.
 */

export type Role = 'impl' | 'test' | 'story';

export type Declaration = {
  readonly iri: string;
  readonly name: string;
  readonly kind?: string;
  readonly path: string;
  readonly package?: string;
  readonly exported: boolean;
  readonly packagePublic: boolean;
  readonly role: Role;
};

const DEUS = `PREFIX deus: <${Ontology.PREFIX}>`;

/** Rows read per lookup; a name declared more often than this is not one a caller can pick from anyway. */
const MAX_ROWS = 500;

const STORY_FILE = /\.stories\.[cm]?[jt]sx?$/;

/** A file's role: `test` from the indexer's `deus:testFile`, `story` by the Storybook naming convention. */
export const roleOf = (path: string, test: boolean): Role => (test ? 'test' : STORY_FILE.test(path) ? 'story' : 'impl');

const ROLE_ORDER: Record<Role, number> = { impl: 0, story: 1, test: 2 };

/** Package-public, then exported, then impl over story over test, then a real symbol over a file's top level. */
export const rank = (left: Declaration, right: Declaration): number =>
  Number(right.packagePublic) - Number(left.packagePublic) ||
  Number(right.exported) - Number(left.exported) ||
  ROLE_ORDER[left.role] - ROLE_ORDER[right.role] ||
  Number(left.name === Ontology.TOP_LEVEL) - Number(right.name === Ontology.TOP_LEVEL) ||
  left.path.localeCompare(right.path) ||
  left.iri.localeCompare(right.iri);

/**
 * A name or canonical name as a key, ordered by {@link rank} before the limit so a name with more
 * declarations than {@link MAX_ROWS} still keeps its best ones; the tail stays inside the pattern
 * because the native evaluator scans a trailing join. Re-export aliases are dropped in the pattern,
 * since an alias is a passage rather than a definition and one ranked ahead would take a limited slot.
 */
const lookup = (key: 'name' | 'canonicalName', value: string, limit: number): string => `${DEUS}
  SELECT ?s ?name ?kind ?path ?pkg ?test ?exp ?pub WHERE {
    ?s deus:${key} ${JSON.stringify(value)} .
    ?file deus:declares ?s ; deus:path ?path .
    FILTER NOT EXISTS { ?s deus:kind "reexport" }
    OPTIONAL { ?s deus:name ?name }
    OPTIONAL { ?s deus:kind ?kind }
    OPTIONAL { ?s deus:exported ?exp }
    OPTIONAL { ?s deus:packagePublic ?pub }
    OPTIONAL { ?file deus:inPackage ?package . ?package deus:name ?pkg }
    OPTIONAL { ?file deus:testFile ?test }
  }
  ORDER BY
    DESC(COALESCE(STR(?pub) = "true", false))
    DESC(COALESCE(STR(?exp) = "true", false))
    (IF(COALESCE(STR(?test) = "true", false), 2, IF(REGEX(?path, ${JSON.stringify(STORY_FILE.source)}), 1, 0)))
    (COALESCE(?name = ${JSON.stringify(Ontology.TOP_LEVEL)}, false))
    ?path ?s
  LIMIT ${limit}`;

const DOTTED_NAME = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/;

const toDeclarations = (rows: readonly Store.Binding[], fallbackName: string): Declaration[] => {
  const byIri = new Map<string, Declaration>();
  for (const row of rows) {
    if (byIri.has(row.s)) {
      continue;
    }
    byIri.set(row.s, {
      iri: row.s,
      name: row.name ?? fallbackName,
      ...(row.kind === undefined ? {} : { kind: row.kind }),
      path: row.path,
      ...(row.pkg === undefined ? {} : { package: row.pkg }),
      exported: row.exp === 'true',
      packagePublic: row.pub === 'true',
      role: roleOf(row.path, row.test === 'true'),
    });
  }
  return [...byIri.values()];
};

/**
 * Every declaration of `name`, ranked by {@link rank}. A name matches `deus:name` or
 * `deus:canonicalName` (`Order.natural`); a dotted name with neither falls back to its last segment.
 * `limit` caps the rows read per key (default {@link MAX_ROWS}).
 */
export const find = (
  store: Store.Api,
  name: string,
  { limit = MAX_ROWS }: { readonly limit?: number } = {},
): Effect.Effect<Declaration[], Store.StoreError> =>
  Effect.gen(function* () {
    const trimmed = name.trim();
    const exact = [
      ...(yield* store.select(lookup('name', trimmed, limit))),
      ...(yield* store.select(lookup('canonicalName', trimmed, limit))),
    ];
    let found = toDeclarations(exact, trimmed);
    if (found.length === 0 && DOTTED_NAME.test(trimmed)) {
      const segment = trimmed.slice(trimmed.lastIndexOf('.') + 1);
      found = toDeclarations(yield* store.select(lookup('name', segment, limit)), segment);
    }
    // Several kinds of one symbol (a class merged with a namespace) collapse above; the rest are ranked.
    return found.sort(rank);
  });
