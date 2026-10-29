//
// Copyright 2026 DXOS.org
//

import { type Expression, type IriTerm, type LiteralTerm, Parser, type Pattern, type Triple } from 'sparqljs';

import { SemanticIndexError } from '../../errors.ts';
import * as Vocab from '../../types/Vocab.ts';
import { type SemanticQuery } from './query-builder.ts';

const PRED_SOURCE = Vocab.PROV + 'wasDerivedFrom';
/** Provenance and description predicates, which never name a statement's predicate. */
const META = new Set([PRED_SOURCE, Vocab.RDF_TYPE, Vocab.RDFS_LABEL, `${Vocab.SX}confidence`]);

const isIri = (term: { readonly termType: string }): term is IriTerm => term.termType === 'NamedNode';
const isLiteral = (term: { readonly termType: string }): term is LiteralTerm => term.termType === 'Literal';

/** Flatten triples + filter expressions from a (possibly nested) pattern list. */
const collect = (patterns: readonly Pattern[], triples: Triple[], filters: Expression[]): void => {
  for (const pattern of patterns) {
    switch (pattern.type) {
      case 'bgp':
        triples.push(...pattern.triples);
        break;
      case 'filter':
        filters.push(pattern.expression);
        break;
      case 'graph':
      case 'group':
      case 'union':
      case 'optional':
      case 'minus':
        collect(pattern.patterns, triples, filters);
        break;
      default:
        // Sub-SELECT.
        if ('where' in pattern && pattern.where) {
          collect(pattern.where, triples, filters);
        }
        break;
    }
  }
};

/** First numeric lower-bound (`>=` / `>`) found in a FILTER - maps to `minConfidence`. */
const numericLowerBound = (filters: readonly Expression[]): number | undefined => {
  for (const expression of filters) {
    if (typeof expression !== 'object' || !('type' in expression) || expression.type !== 'operation') {
      continue;
    }
    if (expression.operator !== '>=' && expression.operator !== '>') {
      continue;
    }
    for (const arg of expression.args) {
      if (typeof arg === 'object' && 'termType' in arg && isLiteral(arg)) {
        const value = Number(arg.value);
        if (!Number.isNaN(value)) {
          return value;
        }
      }
    }
  }
  return undefined;
};

/**
 * Parse a SPARQL SELECT into a structured {@link SemanticQuery} over named-graph statements - the
 * browser/Workers-safe alternative to executing SPARQL (Comunica does not bundle for either). It
 * recognizes the bounded family of fact-retrieval patterns (entity / predicate / source /
 * confidence), the inverse of {@link buildSparql}; unsupported constructs are ignored.
 */
export const parseSparqlToQuery = (sparql: string): SemanticQuery => {
  let parsed;
  try {
    parsed = new Parser().parse(sparql);
  } catch (cause) {
    throw new SemanticIndexError({ message: 'Failed to parse SPARQL', cause });
  }
  if (!('where' in parsed) || !parsed.where) {
    throw new SemanticIndexError({ message: 'Unsupported SPARQL: expected a SELECT with a WHERE clause' });
  }

  const triples: Triple[] = [];
  const filters: Expression[] = [];
  collect(parsed.where, triples, filters);

  const subjectEntities = new Set<string>();
  const objectEntities = new Set<string>();
  let predicate: string | undefined;
  let source: string | undefined;

  for (const triple of triples) {
    const p = triple.predicate;
    const { subject, object } = triple;
    if ('termType' in p && isIri(p) && p.value === PRED_SOURCE) {
      if (isLiteral(object)) {
        source = object.value;
      }
      continue;
    }
    if ('termType' in p && isIri(p) && META.has(p.value)) {
      continue;
    }
    // A statement pattern: an IRI in subject or object position names an entity, an IRI predicate the relation.
    if ('termType' in subject && isIri(subject)) {
      subjectEntities.add(Vocab.entityKey(subject.value));
    }
    if ('termType' in object && isIri(object)) {
      objectEntities.add(Vocab.entityKey(object.value));
    }
    if ('termType' in p && isIri(p)) {
      predicate = p.value;
    }
  }

  // A subject+object match on the same entity is the `entity` (subject-or-object) form (buildSparql's
  // UNION); a lone subject is `subjectEntity`; a lone object maps to `entity` (the closest field).
  const shared = [...subjectEntities].find((id) => objectEntities.has(id));
  const minConfidence = numericLowerBound(filters);

  return {
    ...(shared
      ? { entity: shared }
      : subjectEntities.size > 0
        ? { subjectEntity: [...subjectEntities][0] }
        : objectEntities.size > 0
          ? { entity: [...objectEntities][0] }
          : {}),
    ...(predicate ? { predicate } : {}),
    ...(source ? { source } : {}),
    ...(minConfidence !== undefined ? { minConfidence } : {}),
  };
};
