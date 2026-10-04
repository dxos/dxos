//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Effect from 'effect/Effect';

import * as Ontology from '../Ontology.ts';
import type * as Store from '../Store.ts';
import type * as Graph from './Graph.ts';
import type * as Zoom from './Zoom.ts';

/**
 * Picks the subgraph a diagram draws from the explored union: implementation details are hidden
 * unless the prompt asks for them, every other file is scored by relevance (System One) boosted by
 * how connected it is, and the drawn set grows outward from the best file so it stays connected.
 */

/** Why a file is hidden; the prompt naming the category brings it back. */
export type Hidden = 'test' | 'story' | 'generated' | 'internal' | 'file-local';

/** The categories a path alone decides, checked in this order. */
const PATH_CATEGORIES = ['test', 'story', 'generated', 'internal'] as const;

const PATHS: Readonly<Record<(typeof PATH_CATEGORIES)[number], RegExp>> = {
  test: /(\.test\.|\.spec\.|\.bench\.|\/testing\/|\/__tests__\/|\/fixtures?\/|\/test-utils?\/|\/test\/)/,
  story: /(\.stories\.|\/stories\/)/,
  generated: /(\/gen\/|\/generated\/|\/__generated__\/|\.gen\.|\.generated\.|_pb\.|\.pb\.)/,
  internal: /\/internal\//,
};

/** Words that ask for a hidden category, matched against the prompt. */
const ASKS: Readonly<Record<Hidden, RegExp>> = {
  'test': /\b(tests?|tested|testing|specs?|fixtures?|harness)\b/i,
  'story': /\b(stor(y|ies)|storybook)\b/i,
  'generated': /\b(generated|codegen|protobuf|proto)\b/i,
  'internal': /\b(internals?|implementation details?)\b/i,
  'file-local': /\b(internals?|implementation details?|helpers?|private)\b/i,
};

/**
 * The category hiding a card, if any. A file with no exported declaration (only file-local code, or
 * nothing but the synthetic `top-level` symbol of a script or test) is an implementation detail.
 */
export const hiddenBy = (card: Pick<Graph.NodeCard, 'path' | 'symbols'>, prompt: string): Hidden | undefined => {
  for (const category of PATH_CATEGORIES) {
    if (PATHS[category].test(card.path)) {
      return ASKS[category].test(prompt) ? undefined : category;
    }
  }
  return card.symbols.length === 0 && !ASKS['file-local'].test(prompt) ? 'file-local' : undefined;
};

/**
 * Weights of the connectivity boost. The boost scales relevance rather than adding to it, so a hub
 * the question is not about stays out however connected it is.
 */
export const WEIGHTS = { candidateDegree: 0.4, indexDegree: 0.4, provenance: 0.2 } as const;

/** The share of relevance a file keeps with no connectivity at all. */
export const BOOST_FLOOR = 0.7;

/**
 * Share of the best file's score every kept file needs: System One rates most loosely related files
 * well above zero, so an absolute threshold alone lets the budget fill with them.
 */
export const RELATIVE_FLOOR = 0.5;

/** Fewest files a diagram should show; below it the relative bars give way to `threshold` alone. */
export const MIN_KEPT = 6;

/**
 * Share of the best file's score a file needs to start a second component rather than join the
 * first: relative, because the best file may have no drawable edge at all and scores shift with the
 * package focus.
 */
export const ISLAND_SHARE = 0.8;

const normalised = (value: number, max: number): number => (max > 0 ? Math.log1p(value) / Math.log1p(max) : 0);

/** How many explorer sources returned the file; a bridge has none of its own. */
const sourceCount = (card: Graph.NodeCard): number =>
  (card.provenance ?? []).filter((source) => source !== 'bridge').length;

export type SelectOptions = {
  readonly prompt: string;
  /** Files importing each candidate across the whole index. */
  readonly indexDegree: ReadonlyMap<string, number>;
};

/**
 * The final score of every card: zero for a hidden one, else its relevance scaled by a boost from
 * its degree in the candidate graph, its degree in the index, and how many explorer sources agreed.
 */
export const score = (
  cards: readonly Graph.NodeCard[],
  relevance: readonly number[],
  { prompt, indexDegree }: SelectOptions,
): number[] => {
  const hidden = cards.map((card) => hiddenBy(card, prompt) !== undefined);
  const visible = cards.filter((_, index) => !hidden[index]);
  const maxCandidate = Math.max(0, ...visible.map((card) => card.inDegree + card.outDegree));
  const maxIndex = Math.max(0, ...visible.map((card) => indexDegree.get(card.iri) ?? 0));
  const maxSources = Math.max(0, ...visible.map(sourceCount));
  return cards.map((card, index) => {
    if (hidden[index]) {
      return 0;
    }
    const boost =
      WEIGHTS.candidateDegree * normalised(card.inDegree + card.outDegree, maxCandidate) +
      WEIGHTS.indexDegree * normalised(indexDegree.get(card.iri) ?? 0, maxIndex) +
      WEIGHTS.provenance * (maxSources > 0 ? sourceCount(card) / maxSources : 0);
    return relevance[index] * (BOOST_FLOOR + (1 - BOOST_FLOOR) * boost);
  });
};

/**
 * The drawn set: the best file, then repeatedly the best file within two hops of the set (one file
 * between is what a relay edge can stand for), all at or above `threshold`. When nothing reachable
 * is left a new component starts only from a file scoring at least {@link ISLAND_SHARE} of the best score,
 * so an unrelated hit cannot float in the diagram on its own. Every kept file clears both `threshold` and
 * {@link RELATIVE_FLOOR} of the best score, unless that leaves fewer than {@link MIN_KEPT}: then the
 * set is grown again over `threshold` alone, with islands allowed from {@link RELATIVE_FLOOR}.
 */
export const keep = (
  nodes: readonly { readonly iri: string; readonly score: number }[],
  edges: readonly Graph.Edge[],
  { threshold, budget }: { readonly threshold: number; readonly budget: number },
): Set<string> => {
  const neighbours = new Map<string, Set<string>>();
  const link = (from: string, to: string) => neighbours.set(from, (neighbours.get(from) ?? new Set()).add(to));
  for (const edge of edges) {
    if (edge.from !== edge.to) {
      link(edge.from, edge.to);
      link(edge.to, edge.from);
    }
  }
  const best = Math.max(0, ...nodes.map((node) => node.score));
  const grow = (floor: number, islandShare: number): Set<string> => {
    const ranked = nodes.filter((node) => node.score >= floor).sort((left, right) => right.score - left.score);
    const kept = new Set<string>();
    const reachable = new Set<string>();
    const add = (iri: string) => {
      kept.add(iri);
      for (const near of neighbours.get(iri) ?? []) {
        reachable.add(near);
        for (const far of neighbours.get(near) ?? []) {
          reachable.add(far);
        }
      }
    };
    while (kept.size < budget) {
      const next =
        ranked.find((node) => !kept.has(node.iri) && reachable.has(node.iri)) ??
        ranked.find((node) => !kept.has(node.iri) && (kept.size === 0 || node.score >= islandShare * best));
      if (next === undefined) {
        break;
      }
      add(next.iri);
    }
    return kept;
  };
  const strict = grow(Math.max(threshold, RELATIVE_FLOOR * best), ISLAND_SHARE);
  return strict.size >= Math.min(MIN_KEPT, budget) ? strict : grow(threshold, RELATIVE_FLOOR);
};

/** A zoom selector over precomputed index degrees, for `Zoom.zoom`'s `select` option. */
export const selector = (options: SelectOptions): Zoom.Selector => ({
  name: 'select',
  score: (cards, relevance) => score(cards, relevance, options),
  keep,
});

const values = (iris: readonly string[]): string => iris.map((iri) => `<${iri}>`).join(' ');

/** How many files import each of `iris` across the whole index. */
export const indexDegrees = (
  store: Store.Api,
  iris: readonly string[],
): Effect.Effect<Map<string, number>, Store.StoreError> =>
  Effect.gen(function* () {
    const degrees = new Map<string, number>();
    for (let start = 0; start < iris.length; start += 50) {
      const rows = yield* store.select(`PREFIX deus: <${Ontology.PREFIX}>
        SELECT ?file (COUNT(DISTINCT ?user) AS ?users) WHERE {
          VALUES ?file { ${values(iris.slice(start, start + 50))} }
          ?user deus:imports ?file
        } GROUP BY ?file`);
      for (const row of rows) {
        degrees.set(row.file, Number(row.users));
      }
    }
    return degrees;
  });
