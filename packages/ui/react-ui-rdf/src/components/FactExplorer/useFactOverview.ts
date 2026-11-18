//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useEffect, useMemo, useState } from 'react';

import * as EffectEx from '@dxos/effect/EffectEx';
import { type FactAnalytics, type FactGroup, RDF, type SemanticQuery } from '@dxos/pipeline-rdf';

import { type FactMatrix, type RankedRow, buildMatrix, predicateLabel, rankGroups } from '../../analytics.ts';

//
// Loads an aggregate overview of a fact set. Every read is bounded: the rankings are capped, the cross-tab is one
// aggregate per row shown, and the fact list carries a cap with the true total beside it. A whole-store read
// (`query({})`) is what this exists to avoid — it is linear in the corpus, and a mailbox's is not small.
//

/** How many rows each ranking keeps. */
export const TOP_ENTITIES = 12;
export const TOP_PREDICATES = 12;
/** How many columns the cross-tab keeps. */
export const MATRIX_COLUMNS = 8;
/** How many facts the drill-down list loads; `total` reports how many there are. */
export const FACT_CAP = 200;

export type FactScope = {
  /** Entity key; scopes every panel and roots the graph. */
  readonly entity?: string;
  /** Predicate IRI. */
  readonly predicate?: string;
  readonly source?: string;
};

export type FactOverview = {
  /** Statements in scope, counted in full however many the list loads. */
  readonly total: number;
  readonly predicates: RankedRow[];
  readonly entities: RankedRow[];
  readonly sources: RankedRow[];
  readonly factuality: RankedRow[];
  readonly matrix: FactMatrix;
  /** The facts themselves, capped at {@link FACT_CAP}. */
  readonly facts: RDF.Fact[];
  readonly pending: boolean;
  readonly error?: string;
};

const EMPTY_MATRIX: FactMatrix = { rows: [], columns: [], max: 0, cell: () => 0 };

const EMPTY: FactOverview = {
  total: 0,
  predicates: [],
  entities: [],
  sources: [],
  factuality: [],
  matrix: EMPTY_MATRIX,
  facts: [],
  pending: true,
};

/** The scope as a store query. */
const toQuery = (scope: FactScope, limit?: number): SemanticQuery => ({
  ...(scope.entity === undefined ? {} : { entity: scope.entity }),
  ...(scope.predicate === undefined ? {} : { predicate: scope.predicate }),
  ...(scope.source === undefined ? {} : { source: scope.source }),
  ...(limit === undefined ? {} : { limit }),
});

/**
 * Reads the whole overview in one pass. The cross-tab is assembled from one predicate aggregate per entity in
 * the ranking — bounded and indexed, where an unscoped two-dimensional aggregate would be the size of the corpus.
 */
const load = (analytics: FactAnalytics, scope: FactScope, ontology: RDF.Ontology.Ontology) =>
  Effect.gen(function* () {
    const query = toQuery(scope);
    const [total, predicates, entities, sources, factuality, facts] = yield* Effect.all([
      analytics.count(query),
      analytics.aggregate({ by: ['predicate'], scope: query, limit: TOP_PREDICATES }),
      analytics.aggregate({ by: ['entity'], scope: query, limit: TOP_ENTITIES }),
      analytics.aggregate({ by: ['source'], scope: query, limit: TOP_ENTITIES }),
      analytics.aggregate({ by: ['factuality'], scope: query }),
      analytics.facts(toQuery(scope, FACT_CAP)),
    ]);

    const entityKeys = entities.flatMap((group) => (group.keys[0] === undefined ? [] : [group.keys[0]]));
    const labels = yield* analytics.entityLabels(entityKeys);
    const byRow = new Map<string, readonly FactGroup[]>(
      yield* Effect.all(
        entityKeys.map((key) =>
          analytics
            .aggregate({ by: ['predicate'], scope: { ...query, entity: key }, limit: MATRIX_COLUMNS })
            .pipe(Effect.map((groups) => [key, groups] as const)),
        ),
      ),
    );

    const asPredicate = (iri: string) => predicateLabel(iri, ontology);
    return {
      total,
      predicates: rankGroups(predicates, { format: asPredicate }),
      entities: rankGroups(entities, { labels }),
      sources: rankGroups(sources, { format: (key) => key }),
      factuality: rankGroups(factuality, { format: (key) => key }),
      matrix: buildMatrix(entities, byRow, {
        rowLabels: labels,
        formatColumn: asPredicate,
        columns: MATRIX_COLUMNS,
      }),
      facts,
      pending: false,
    } satisfies FactOverview;
  });

/**
 * The aggregate overview of a fact set in the given scope, reloaded whenever either changes. `revision` forces a
 * reload when the underlying store has been written to — the store is not reactive, so a writer must say so.
 */
export const useFactOverview = (
  analytics: FactAnalytics,
  scope: FactScope,
  options: { ontology?: RDF.Ontology.Ontology; revision?: number } = {},
): FactOverview => {
  const { ontology, revision = 0 } = options;
  const [overview, setOverview] = useState<FactOverview>(EMPTY);
  const { entity, predicate, source } = scope;
  const resolved = useMemo(() => ontology ?? RDF.Ontology.DEFAULT, [ontology]);

  useEffect(() => {
    // Ignore a late resolve after the scope changed, so the view never shows another scope's counts.
    let cancelled = false;
    setOverview((current) => ({ ...current, pending: true }));
    void EffectEx.runPromise(
      load(analytics, { entity, predicate, source }, resolved).pipe(
        Effect.catch((error) =>
          Effect.succeed({ ...EMPTY, pending: false, error: error.message } satisfies FactOverview),
        ),
      ),
    ).then((next) => {
      if (!cancelled) {
        setOverview(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [analytics, entity, predicate, source, resolved, revision]);

  return overview;
};
