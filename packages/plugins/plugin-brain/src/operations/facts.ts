//
// Copyright 2026 DXOS.org
//

import { type RDF } from '@dxos/pipeline-rdf';

import { type BrainOperation } from '#types';

/** Display form of a term: the preserved surface label, else the slug; literals render verbatim. */
export const formatTerm = (term: RDF.Term): string => ('entity' in term ? (term.label ?? term.entity) : term.literal);

/** Projects a stored fact onto the LLM-facing {@link BrainOperation.CompactFact} shape. */
export const toCompactFact = (fact: RDF.Fact): BrainOperation.CompactFact => ({
  id: fact.id,
  subject: formatTerm(fact.assertion.subject),
  predicate: fact.assertion.predicate,
  object: formatTerm(fact.assertion.object),
  factuality: fact.factuality.value,
  ...(fact.factuality.confidence !== undefined ? { confidence: fact.factuality.confidence } : {}),
  date: fact.recordedAt.slice(0, 10),
  source: fact.attribution.source,
});

/** One text line per fact for LLM prompts: `[id] subject — predicate — object (factuality, date)`. */
export const factLine = (fact: BrainOperation.CompactFact): string =>
  `[${fact.id}] ${fact.subject} — ${fact.predicate} — ${fact.object} (${fact.factuality}${
    fact.confidence !== undefined ? ` ${fact.confidence}` : ''
  }, ${fact.date})`;
