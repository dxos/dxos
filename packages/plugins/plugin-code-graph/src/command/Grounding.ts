//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import { CodeIndexClient } from '#client';
import { Iri } from '#graph';

/** One workspace package, as the catalog lists it. */
export type Package = { iri: string; name: string; path: string };

/** A resource the command probably means, for the model to use by IRI instead of guessing names. */
export type Candidate = { iri: string; label: string; why: string };

/** Most candidates put in front of the model; enough for a command that names a few things. */
const MAX_CANDIDATES = 16;

/** Words that never name a package or symbol, so they are not matched. */
const STOP_WORDS = new Set(
  (
    'a an and are as at be by does do for from graph in into is it its me of on or show the their them these this ' +
    'those to what which who with all add remove clear draw display depend depends dependents dependencies uses use ' +
    'used using package packages file files symbol symbols export exports import imports everything only also how ' +
    'they each other there here then that than can could would should please now just'
  ).split(' '),
);

/** Directories every package path shares, which name a layer of the tree rather than a subsystem. */
const GENERIC_DIRS = new Set(['packages', 'plugins', 'core', 'common', 'sdk', 'ui', 'apps', 'tools', 'src', 'compute']);

const CATALOG_QUERY = `PREFIX deus: <${Iri.DEUS}>
SELECT ?node ?name ?path WHERE { ?node a deus:Package ; deus:name ?name ; deus:packagePath ?path . }`;

// The catalog changes only when the index is rebuilt, and fetching it costs a cold index seconds; the page keeps it.
let catalog: readonly Package[] | undefined;

/** The workspace's packages, fetched once per page. */
export const packages: Effect.Effect<readonly Package[], CodeIndexClient.CodeIndexError> = Effect.suspend(() =>
  catalog
    ? Effect.succeed(catalog)
    : CodeIndexClient.query(CATALOG_QUERY, 2000).pipe(
        Effect.map(({ rows }) => {
          // A package is stated once per graph and fixtures reuse real names, so keep one row per IRI, outside fixtures.
          const byIri = new Map<string, Package>();
          for (const { node, name, path } of rows) {
            if (node && name && path && !path.includes('__fixtures__') && !byIri.has(node)) {
              byIri.set(node, { iri: node, name, path });
            }
          }
          return [...byIri.values()];
        }),
        Effect.tap((loaded) =>
          Effect.sync(() => {
            catalog = loaded;
          }),
        ),
      ),
);

/** The words of a command that could name something: lower-cased, stop words dropped. */
export const words = (command: string): string[] =>
  [...new Set(command.toLowerCase().match(/[@a-z0-9][\w./@-]*/g) ?? [])]
    .map((word) => word.replace(/[.]+$/, ''))
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));

/**
 * Packages a command names: by full name (`@dxos/echo`), by name without scope (`echo`, `plugin-markdown`), or by a
 * directory on their path (`halo` matches everything under `packages/core/halo/`). Exact names rank first.
 */
export const matchPackages = (
  catalog: readonly Package[],
  command: string,
): { candidate: Candidate; score: number }[] => {
  const terms = words(command);
  const scored: { candidate: Candidate; score: number }[] = [];
  for (const pkg of catalog) {
    const bare = pkg.name.replace(/^@[^/]+\//, '').toLowerCase();
    const segments = pkg.path.toLowerCase().split('/');
    for (const term of terms) {
      const score =
        pkg.name.toLowerCase() === term || bare === term
          ? 3
          : !GENERIC_DIRS.has(term) && segments.slice(0, -1).includes(term)
            ? 1
            : bare.split('-').includes(term) && bare.split('-').length <= 2
              ? 2
              : 0;
      if (score > 0) {
        scored.push({ candidate: { iri: pkg.iri, label: pkg.name, why: `package at ${pkg.path}` }, score });
        break;
      }
    }
  }
  return scored.sort((left, right) => right.score - left.score);
};

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/**
 * Names a symbol in the command might have, as written in code: single words capitalized (`Identity`), adjacent pairs
 * joined (`IdentityService`) or as a namespace member (`Identity.Service`), and anything already shaped like code.
 */
export const symbolNames = (command: string): string[] => {
  const raw = command.match(/[A-Za-z_][\w.]*/g) ?? [];
  const terms = raw.filter((word) => !STOP_WORDS.has(word.toLowerCase()) && word.length >= 3);
  const names = new Set<string>();
  for (const term of terms) {
    if (/[A-Z.]/.test(term.slice(1))) {
      names.add(term);
    }
  }
  for (let index = 0; index + 1 < terms.length; index++) {
    const [left, right] = [capitalize(terms[index]), capitalize(terms[index + 1])];
    names.add(`${left}${right}`);
    names.add(`${left}.${right}`);
  }
  return [...names].slice(0, 24);
};

// VALUES sits inside each branch: outside, oxigraph scans the union once per name (~160 ms each) instead of a lookup.
const symbolQuery = (names: readonly string[]) => {
  const values = `VALUES ?name { ${names.map((name) => JSON.stringify(name)).join(' ')} }`;
  return `PREFIX deus: <${Iri.DEUS}>
SELECT DISTINCT ?node ?name ?kind WHERE {
  { ${values} ?node deus:canonicalName ?name } UNION { ${values} ?node deus:name ?name . ?node deus:packagePublic true }
  OPTIONAL { ?node deus:kind ?kind }
}`;
};

/** Exported symbols whose name or canonical name the command spells, by exact match (milliseconds on a warm index). */
export const matchSymbols = (command: string): Effect.Effect<Candidate[], CodeIndexClient.CodeIndexError> => {
  const names = symbolNames(command);
  return names.length === 0
    ? Effect.succeed([])
    : CodeIndexClient.query(symbolQuery(names), 50).pipe(
        Effect.map(({ rows }) =>
          rows.flatMap(({ node, name, kind }) =>
            node
              ? [
                  {
                    iri: node,
                    label: name ?? Iri.labelOf(node),
                    why: `${kind ?? 'symbol'} in ${Iri.pathOf(node) ?? '?'}`,
                  },
                ]
              : [],
          ),
        ),
      );
};

/** The resources a command probably means; empty when the index cannot answer, since grounding is only a hint. */
export const ground = (command: string): Effect.Effect<Candidate[]> =>
  Effect.all([packages.pipe(Effect.map((catalog) => matchPackages(catalog, command))), matchSymbols(command)], {
    concurrency: 'unbounded',
  }).pipe(
    // Packages named outright first, then symbols, then packages that only share a directory with a word.
    Effect.map(([pkgs, symbols]) =>
      [
        ...pkgs.filter(({ score }) => score >= 2).map(({ candidate }) => candidate),
        ...symbols,
        ...pkgs.filter(({ score }) => score < 2).map(({ candidate }) => candidate),
      ].slice(0, MAX_CANDIDATES),
    ),
    Effect.orElseSucceed((): Candidate[] => []),
  );

/** The candidates as the model reads them. */
export const describe = (candidates: readonly Candidate[]): string =>
  candidates.length === 0
    ? ''
    : [
        'Resources in the index that match words in the command (use their IRIs directly, e.g. in VALUES):',
        ...candidates.map(({ iri, label, why }) => `- <${iri}> ${label} - ${why}`),
      ].join('\n');
