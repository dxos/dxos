//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Stage } from '@dxos/pipeline';

import { normalizePredicate } from '../internal/sparql/normalize-predicate';
import { type DocumentFacts } from './extract-facts';

export type NormalizeOptions = {
  /**
   * Synonym table: predicate (any inflection — keys are relation-key normalized) → canonical
   * predicate. E.g. `{ 'employed by': 'works at', 'works for': 'works at' }`.
   */
  readonly synonyms: Readonly<Record<string, string>>;
};

/**
 * Predicate-canonicalization stage: rewrites each fact's predicate to its canonical form when the
 * synonym table maps its relation key ({@link normalizePredicate}); unmapped predicates keep their
 * original surface form (query-time fuzzy matching already collapses inflection). This is the
 * write-time reconcile seam — vocabulary strategy (curated set vs embeddings) is deliberately left
 * to the caller-supplied table for now.
 */
export const normalizeFactsStage = (options: NormalizeOptions): Stage.Stage<DocumentFacts, DocumentFacts> => {
  const lookup = new Map(Object.entries(options.synonyms).map(([key, value]) => [normalizePredicate(key), value]));
  return Stage.map('normalize-predicates', ({ doc, facts }: DocumentFacts) =>
    Effect.succeed({
      doc,
      facts: facts.map((fact) => {
        const canonical = lookup.get(normalizePredicate(fact.assertion.predicate));
        return canonical === undefined || canonical === fact.assertion.predicate
          ? fact
          : { ...fact, assertion: { ...fact.assertion, predicate: canonical } };
      }),
    }),
  );
};
