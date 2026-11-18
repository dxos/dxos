//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type SemanticIndexError } from '../errors.ts';
import { type FactAggregate, type FactDimension, type FactGroup } from '../internal/sparql/aggregate.ts';
import { matchingPredicates } from '../internal/sparql/match.ts';
import { type SemanticQuery } from '../internal/sparql/query-builder.ts';
import { type Fact, Graph, Mapping, Ontology, termValue } from '../types/index.ts';
import { type FactStoreApi } from './fact-store.ts';

//
// The read surface a fact overview needs, with two implementations: a store (aggregating in SQLite) and a plain
// fact array (aggregating in JS). A view written against this runs over a mailbox-sized store and over a
// hand-authored fixture unchanged, which is what lets a story show the same surface the app does.
//

export type FactAnalytics = {
  /** Statements the query matches — the total an overview reports, independent of any cap on the fact list. */
  readonly count: (query?: SemanticQuery) => Effect.Effect<number, SemanticIndexError>;
  /** Counts per group, busiest first. */
  readonly aggregate: (aggregate: FactAggregate) => Effect.Effect<FactGroup[], SemanticIndexError>;
  /** The matching facts themselves, for the drill-down; honours {@link SemanticQuery.limit}. */
  readonly facts: (query?: SemanticQuery) => Effect.Effect<Fact[], SemanticIndexError>;
  /** Display labels for entity keys; a key the data never labels is absent. */
  readonly entityLabels: (keys: readonly string[]) => Effect.Effect<Map<string, string>, SemanticIndexError>;
  /**
   * Which graphs a later fact replaced or withdrew, so a history can say WHY a claim no longer stands. A graph
   * that still stands is ABSENT, in both backends, so `has` reads as "withdrawn" either way round.
   */
  readonly statuses: () => Effect.Effect<Map<string, Graph.Status>, SemanticIndexError>;
};

/** Analytics backed by a store, so the counting happens in SQLite rather than over materialized facts. */
export const fromStore = (store: FactStoreApi): FactAnalytics => ({
  count: (query = {}) => store.count(query),
  aggregate: (aggregate) => store.aggregate(aggregate),
  facts: (query = {}) => store.query(query),
  entityLabels: (keys) => store.entityLabels(keys),
  statuses: () => store.statuses(),
});

/** Absent `illocution` means the fact is a plain assertion; kept in step with the store's aggregate. */
const DEFAULT_FORCE = 'assertive';

/** The predicate labels of a fact set, as {@link matchingPredicates} expects them: stored IRI → label. */
const predicateLabelsOf = (facts: readonly Fact[], ontology: Ontology.Ontology): Map<string, string> =>
  new Map(facts.map((fact) => [Mapping.predicateOf(fact, ontology), fact.assertion.predicate]));

/**
 * Whether a fact satisfies a query, over an in-memory set. Predicates resolve through the same
 * {@link matchingPredicates} the store uses, against the IRI each fact resolves to — a fixture fact carries a
 * surface form and no `predicateIri`, so comparing stored IRIs directly would match nothing.
 */
const matches = (
  fact: Fact,
  query: SemanticQuery,
  predicates: ReadonlySet<string> | undefined,
  ontology: Ontology.Ontology,
): boolean => {
  const subject = termValue(fact.assertion.subject);
  const object = termValue(fact.assertion.object);
  return (
    (query.subjectEntity === undefined || subject === query.subjectEntity) &&
    (query.entity === undefined ||
      subject === query.entity ||
      (fact.assertion.object.kind === 'entity' && object === query.entity)) &&
    (predicates === undefined || predicates.has(Mapping.predicateOf(fact, ontology))) &&
    (query.source === undefined || fact.attribution.source === query.source) &&
    (query.minConfidence === undefined || (fact.factuality.confidence ?? 0) >= query.minConfidence)
  );
};

/**
 * The values a fact contributes to a dimension — several for `entity`, which counts a fact once per position the
 * entity holds, and none where the fact carries no value for it (an unattributed fact has no agent).
 */
const valuesOf = (fact: Fact, name: FactDimension, ontology: Ontology.Ontology): string[] => {
  const { subject, object } = fact.assertion;
  switch (name) {
    case 'predicate':
      return [Mapping.predicateOf(fact, ontology)];
    case 'subject':
      return [termValue(subject)];
    case 'object':
      return [termValue(object)];
    case 'entity':
      // Literals are not entities, matching the store's `isIRI(?term)` filter.
      return [subject, object].flatMap((term) => (term.kind === 'entity' ? [term.entity] : []));
    case 'source':
      return [fact.attribution.source];
    case 'agent':
      return fact.attribution.agent === undefined ? [] : [fact.attribution.agent];
    case 'factuality':
      return [fact.factuality.value];
    case 'force':
      return [fact.illocution?.force ?? DEFAULT_FORCE];
  }
};

/** The cartesian product of each dimension's values: one group key per combination the fact contributes to. */
const keyCombinations = (fact: Fact, by: FactAggregate['by'], ontology: Ontology.Ontology): string[][] =>
  by.reduce<string[][]>(
    (combinations, name) =>
      combinations.flatMap((prefix) => valuesOf(fact, name, ontology).map((value) => [...prefix, value])),
    [[]],
  );

/**
 * Analytics over a plain fact array: the same dimensions and scoping as the store's, computed in JS. For
 * fixtures, stories and sets small enough that holding them in memory is the point; a mailbox-sized corpus wants
 * {@link fromStore}.
 */
export const fromFacts = (facts: readonly Fact[], ontology: Ontology.Ontology = Ontology.DEFAULT): FactAnalytics => {
  // Computed over the WHOLE set, never the scoped one: the fact that corrects a claim can be outside the scope
  // that found it, and a correction the scope misses would leave the stale claim standing.
  const statuses = Graph.status(facts);
  const stands = (fact: Fact): boolean => statuses.get(Mapping.graphOf(fact)) === 'active';
  // Only the graphs that no longer stand, which is what the store reports: `has` means the same in both backends.
  const withdrawn = new Map([...statuses].filter(([, status]) => status !== 'active'));

  const scoped = (query: SemanticQuery): Fact[] => {
    const predicates =
      query.predicate === undefined
        ? undefined
        : matchingPredicates(query.predicate, predicateLabelsOf(facts, ontology), ontology);
    return facts.filter((fact) => matches(fact, query, predicates, ontology) && (!query.current || stands(fact)));
  };

  return {
    count: (query = {}) => Effect.sync(() => scoped(query).length),

    // `scoped` applies `current`, so a count and its aggregate always agree with the list beneath them.
    aggregate: ({ by, scope = {}, limit }) =>
      Effect.sync(() => {
        const counts = new Map<string, FactGroup>();
        for (const fact of scoped(scope)) {
          for (const keys of keyCombinations(fact, by, ontology)) {
            // `\u0001` cannot occur in a key, so the composite is unambiguous.
            const id = keys.join('\u0001');
            const existing = counts.get(id);
            counts.set(id, { keys, count: (existing?.count ?? 0) + 1 });
          }
        }
        const groups = [...counts.values()].sort(
          (left, right) => right.count - left.count || left.keys.join().localeCompare(right.keys.join()),
        );
        return limit === undefined ? groups : groups.slice(0, Math.max(0, Math.trunc(limit)));
      }),

    facts: (query = {}) =>
      Effect.sync(() => {
        const result = scoped(query);
        return query.limit === undefined ? result : result.slice(0, Math.max(0, Math.trunc(query.limit)));
      }),

    statuses: () => Effect.sync(() => withdrawn),

    entityLabels: (keys) =>
      Effect.sync(() => {
        const wanted = new Set(keys);
        const labels = new Map<string, string>();
        for (const fact of facts) {
          for (const term of [fact.assertion.subject, fact.assertion.object]) {
            if (
              term.kind === 'entity' &&
              term.label !== undefined &&
              wanted.has(term.entity) &&
              !labels.has(term.entity)
            ) {
              labels.set(term.entity, term.label);
            }
          }
        }
        return labels;
      }),
  };
};
