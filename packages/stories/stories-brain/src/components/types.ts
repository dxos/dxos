//
// Copyright 2026 DXOS.org
//

import { type RDF } from '@dxos/pipeline-rdf';
import { formatTerm } from '@dxos/react-ui-rdf';

export type EntityItem = {
  /** Entity id (slug) — the context key for filtering / graph rooting. */
  id: string;
  label: string;
  /** Number of facts the entity appears in (as subject or object). */
  count: number;
};

/**
 * Distinct entities mentioned across the facts (subject + object entity terms), deduped by id with a
 * display label and occurrence count, busiest first. Literal terms are not entities and are skipped.
 */
export const entitiesFromFacts = (facts: RDF.Fact[]): EntityItem[] => {
  const byId = new Map<string, EntityItem>();
  const add = (term: RDF.Term) => {
    if (!('entity' in term)) {
      return;
    }
    const existing = byId.get(term.entity);
    if (existing) {
      existing.count += 1;
    } else {
      byId.set(term.entity, { id: term.entity, label: formatTerm(term), count: 1 });
    }
  };
  for (const fact of facts) {
    add(fact.assertion.subject);
    add(fact.assertion.object);
  }
  return [...byId.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

export type PredicateItem = {
  /** The predicate string (also the id). */
  predicate: string;
  /** Number of facts using this predicate. */
  count: number;
};

/** Distinct predicates across the facts with occurrence counts, busiest first. */
export const predicatesFromFacts = (facts: RDF.Fact[]): PredicateItem[] => {
  const byPredicate = new Map<string, number>();
  for (const fact of facts) {
    const { predicate } = fact.assertion;
    byPredicate.set(predicate, (byPredicate.get(predicate) ?? 0) + 1);
  }
  return [...byPredicate.entries()]
    .map(([predicate, count]) => ({ predicate, count }))
    .sort((a, b) => b.count - a.count || a.predicate.localeCompare(b.predicate));
};
