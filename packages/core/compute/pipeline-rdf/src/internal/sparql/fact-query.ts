//
// Copyright 2026 DXOS.org
//

import { type Quad } from 'n3';

import { type Fact } from '../../types/index.ts';
import * as Mapping from '../../types/Mapping.ts';
import * as Predicate from '../../types/Predicate.ts';
import * as Vocab from '../../types/Vocab.ts';
import { type SemanticQuery } from './query-builder.ts';

/**
 * SPARQL selecting every triple of the fact nodes that match the query's graph constraints. The predicate and
 * confidence constraints are applied by {@link selectFacts}: SPARQL cannot express the normalized relation key.
 */
export const factTriplesSparql = (query: SemanticQuery): string => {
  const patterns: string[] = [];
  if (query.subjectEntity) {
    patterns.push(`?fact <${Vocab.SX}subject> <${Vocab.entityIri(query.subjectEntity).value}> .`);
  }
  if (query.source) {
    patterns.push(`?fact <${Vocab.PROV}wasDerivedFrom> ${JSON.stringify(query.source)} .`);
  }
  if (query.entity) {
    const iri = Vocab.entityIri(query.entity).value;
    patterns.push(`{ ?fact <${Vocab.SX}subject> <${iri}> } UNION { ?fact <${Vocab.SX}object> <${iri}> }`);
  }
  return patterns.length === 0
    ? 'SELECT ?fact ?p ?o WHERE { ?fact ?p ?o }'
    : `SELECT ?fact ?p ?o WHERE { { SELECT DISTINCT ?fact WHERE { ${patterns.join(' ')} } } ?fact ?p ?o }`;
};

/**
 * Reassembles the facts in `triples` that also match the query's predicate (by normalized relation key, or a
 * substring of it either way, since an LLM rarely reproduces the stored verb phrase) and minimum confidence.
 */
export const selectFacts = (triples: readonly Quad[], query: SemanticQuery): Fact[] => {
  const byNode = new Map<string, Quad[]>();
  for (const triple of triples) {
    const node = triple.subject.value;
    if (node.startsWith(Vocab.FACT)) {
      const nodeTriples = byNode.get(node);
      if (nodeTriples) {
        nodeTriples.push(triple);
      } else {
        byNode.set(node, [triple]);
      }
    }
  }

  let nodes = [...byNode.values()];
  if (query.predicate) {
    const needle = Predicate.normalize(query.predicate);
    const predicateIri = Vocab.sx('predicate').value;
    nodes = nodes.filter((nodeTriples) =>
      nodeTriples.some((triple) => {
        if (triple.predicate.value !== predicateIri) {
          return false;
        }
        const value = Predicate.normalize(triple.object.value);
        return value === needle || value.includes(needle) || needle.includes(value);
      }),
    );
  }

  const facts = Mapping.triplesToFacts(nodes.flat());
  const min = query.minConfidence;
  return min === undefined ? facts : facts.filter((fact) => (fact.factuality.confidence ?? 0) >= min);
};
