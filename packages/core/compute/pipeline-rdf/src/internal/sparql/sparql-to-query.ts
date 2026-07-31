//
// Copyright 2026 DXOS.org
//

import { type Expression, type IriTerm, type LiteralTerm, Parser, type Pattern, type Triple } from 'sparqljs';

import { SemanticIndexError } from '../../errors';
import { ENTITY, PROV, SX, entityIdFromIri } from '../vocab';
import { type SemanticQuery } from './query-builder';

// Reified-fact predicates (see DESIGN.md "Reification").
const PRED_SUBJECT = SX + 'subject';
const PRED_OBJECT = SX + 'object';
const PRED_PREDICATE = SX + 'predicate';
const PRED_SOURCE = PROV + 'wasDerivedFrom';

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
      case 'group':
      case 'union':
      case 'optional':
      case 'minus':
        collect(pattern.patterns, triples, filters);
        break;
      default:
        // Sub-SELECT (buildSparql wraps the constraints in `{ SELECT DISTINCT ?fact WHERE { … } }`).
        if ('where' in pattern && pattern.where) {
          collect(pattern.where, triples, filters);
        }
        break;
    }
  }
};

/** First numeric lower-bound (`>=` / `>`) found in a FILTER — maps to `minConfidence`. */
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
 * Parse a SPARQL SELECT into a structured {@link SemanticQuery} over the reified-fact shape — the
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
    if (!('termType' in p) || !isIri(p)) {
      continue; // Property paths / variable predicates are unsupported.
    }
    const object = triple.object;
    switch (p.value) {
      case PRED_SUBJECT:
        if (isIri(object) && object.value.startsWith(ENTITY)) {
          subjectEntities.add(entityIdFromIri(object.value));
        }
        break;
      case PRED_OBJECT:
        if (isIri(object) && object.value.startsWith(ENTITY)) {
          objectEntities.add(entityIdFromIri(object.value));
        }
        break;
      case PRED_PREDICATE:
        if (isLiteral(object)) {
          predicate = object.value;
        }
        break;
      case PRED_SOURCE:
        if (isLiteral(object)) {
          source = object.value;
        }
        break;
      default:
        break;
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
