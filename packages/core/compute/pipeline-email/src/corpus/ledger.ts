//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type FactStoreApi, type SemanticIndexError, type Type } from '@dxos/pipeline-rdf';

/**
 * Predicates treated as commitments (spec §3③ commitment ledger). Editable: extraction phrasing
 * varies by corpus and extraction rules, so callers tune this list rather than the query logic.
 */
export const DEFAULT_COMMITMENT_PREDICATES: readonly string[] = ['owes', 'will send', 'will provide', 'must', 'due'];

export type LedgerOptions = {
  /** Predicates that mark a fact as a commitment. */
  readonly predicates?: readonly string[];
};

/** One row of the commitment ledger, traceable to its supporting fact. */
export type Commitment = {
  /** Who owes it (fact subject label). */
  readonly who: string;
  /** What is owed (fact object label or literal). */
  readonly what: string;
  /** Deadline (assertion validTo), when stated. */
  readonly dueBy?: string;
  /** Model confidence carried from the fact's factuality. */
  readonly confidence?: number;
  readonly factId: string;
  /** Source message (fact attribution). */
  readonly source: string;
};

const termLabel = (term: Type.Assertion['subject']): string =>
  'entity' in term ? (term.label ?? term.entity) : term.literal;

const toCommitment = (fact: Type.Fact): Commitment => ({
  who: termLabel(fact.assertion.subject),
  what: termLabel(fact.assertion.object),
  ...(fact.assertion.validTo ? { dueBy: fact.assertion.validTo } : {}),
  ...(fact.factuality.confidence !== undefined ? { confidence: fact.factuality.confidence } : {}),
  factId: fact.id,
  source: fact.attribution.source,
});

/**
 * Query the fact store for outstanding commitments — the spec's cross-thread "owe / owed" ledger.
 * Uses the structured query path (one `query({ predicate })` per commitment predicate, compiled to
 * SPARQL on the sqlite backend), which works on both store backends; rows are advisory evidence
 * (§4 canonicality) and each carries its fact id + source message for grounding.
 */
export const commitmentLedger = (
  store: FactStoreApi,
  options?: LedgerOptions,
): Effect.Effect<Commitment[], SemanticIndexError> =>
  Effect.forEach(options?.predicates ?? DEFAULT_COMMITMENT_PREDICATES, (predicate) => store.query({ predicate })).pipe(
    Effect.map((results) => {
      // A fact can match several predicate probes; keep the first occurrence.
      const seen = new Set<string>();
      const commitments: Commitment[] = [];
      for (const fact of results.flat()) {
        if (!seen.has(fact.id)) {
          seen.add(fact.id);
          commitments.push(toCommitment(fact));
        }
      }
      // Deadlines first (soonest first), then the rest in stable fact order.
      return commitments.sort((a, b) =>
        a.dueBy && b.dueBy ? a.dueBy.localeCompare(b.dueBy) : a.dueBy ? -1 : b.dueBy ? 1 : 0,
      );
    }),
  );
