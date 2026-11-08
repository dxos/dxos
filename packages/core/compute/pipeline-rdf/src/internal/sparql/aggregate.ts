//
// Copyright 2026 DXOS.org
//

import * as Vocab from '../../types/Vocab.ts';
import { ONTOLOGY, iriRef, isEntity, statementFilter } from './fact-query.ts';
import { type SemanticQuery } from './query-builder.ts';

//
// Aggregates over stored statements, compiled to SPARQL so the counting happens in SQLite rather than
// over materialized facts. A whole-store `query({})` is linear in the corpus; an overview of a mailbox's
// facts needs counts per predicate / entity / source, which are bounded by the ontology and the screen.
//

/**
 * A dimension an aggregate groups by. The term dimensions (`subject`, `object`, `entity`) group by the
 * **entity key** — the slug a global or graph-local entity IRI carries, any other IRI or a literal by its
 * lexical form — which is the same join key {@link SemanticQuery.entity} matches on.
 */
export type FactDimension = 'predicate' | 'subject' | 'object' | 'entity' | 'source' | 'agent' | 'factuality' | 'force';

export const FACT_DIMENSIONS: ReadonlyArray<FactDimension> = [
  'predicate',
  'subject',
  'object',
  'entity',
  'source',
  'agent',
  'factuality',
  'force',
];

/** One or two dimensions; two produce a cross-tab, the first down the rows and the second across the columns. */
export type FactGrouping = readonly [FactDimension] | readonly [FactDimension, FactDimension];

export type FactAggregate = {
  readonly by: FactGrouping;
  /** Scopes the aggregate exactly as it scopes a fact read. */
  readonly scope?: SemanticQuery;
  /** Keep only the busiest N groups; unbounded when absent. */
  readonly limit?: number;
};

/** One group of an aggregate: the dimension values (parallel to {@link FactAggregate.by}) and the statements in it. */
export type FactGroup = {
  readonly keys: readonly string[];
  /**
   * Statements in the group. An entity's count is **mentions** — a statement with the entity in both
   * positions is counted twice — which is the degree the overview ranks by.
   */
  readonly count: number;
};

/** Absent `sx:force` means the fact is a plain assertion (see the Illocution design). */
const DEFAULT_FORCE = 'assertive';

const PROV_DERIVED_FROM = iriRef(`${Vocab.PROV}wasDerivedFrom`);
const PROV_ATTRIBUTED_TO = iriRef(`${Vocab.PROV}wasAttributedTo`);
const SX_CONFIDENCE = iriRef(`${Vocab.SX}confidence`);
const SX_FACTUALITY = iriRef(`${Vocab.SX}factuality`);
const SX_FORCE = iriRef(`${Vocab.SX}force`);
const SX_SUPERSEDES = iriRef(`${Vocab.SX}supersedes`);
const SX_RETRACTS = iriRef(`${Vocab.SX}retracts`);

/** Every graph that still stands: nothing supersedes or retracts it. */
export const STANDING_FILTER = [
  `FILTER NOT EXISTS { ?replacement ${SX_SUPERSEDES} ?g }`,
  `FILTER NOT EXISTS { ?withdrawal ${SX_RETRACTS} ?g }`,
];

/** The graphs a later fact supersedes, and those it retracts, as `?target` rows. */
export const SUPERSEDED_SPARQL = `SELECT DISTINCT ?target WHERE { ?g ${SX_SUPERSEDES} ?target }`;
export const RETRACTED_SPARQL = `SELECT DISTINCT ?target WHERE { ?g ${SX_RETRACTS} ?target }`;

/**
 * SPARQL for the entity key of `variable`: the slug of an entity IRI local to the bound `?g`, else the slug of a
 * global `entity:` IRI, else the IRI or literal as written. Mirrors {@link Vocab.entityKey}; the slug stays
 * percent-encoded, as it is in the IRI, and is decoded when the row is read.
 */
const entityKeyExpr = (variable: string): string => {
  const term = `STR(${variable})`;
  const local = 'CONCAT(STR(?g), "#")';
  const global = JSON.stringify(Vocab.ENTITY);
  return [
    `IF(!isIRI(${variable}), ${term},`,
    `IF(STRSTARTS(${term}, ${local}), STRAFTER(${term}, ${local}),`,
    `IF(STRSTARTS(${term}, ${global}), STRAFTER(${term}, ${global}), ${term})))`,
  ].join(' ');
};

/**
 * Statement-level patterns for a query: every constraint applies to the statement itself (`?s ?p ?o` in `?g`)
 * rather than to its graph, so a count is exact. {@link FactStoreApi.query} cannot do this — it must load whole
 * graphs to reassemble facts, so it finds candidate graphs and re-checks each statement in JS.
 */
export const statementPatterns = (query: SemanticQuery, predicates?: ReadonlySet<string>): string[] => {
  const patterns = ['GRAPH ?g { ?s ?p ?o }', statementFilter('?g', '?p', '?o')];
  if (query.subjectEntity) {
    patterns.push(`FILTER(${isEntity('?s', query.subjectEntity)})`);
  }
  if (predicates) {
    patterns.push(`FILTER(?p IN (${[...predicates].map(iriRef).join(', ')}))`);
  }
  if (query.entity) {
    patterns.push(`FILTER(${isEntity('?s', query.entity)} || ${isEntity('?o', query.entity)})`);
  }
  if (query.source) {
    patterns.push(`?g ${PROV_DERIVED_FROM} ${JSON.stringify(query.source)} .`);
  }
  if (query.minConfidence !== undefined) {
    if (!Number.isFinite(query.minConfidence)) {
      throw new TypeError('minConfidence must be a finite number.');
    }
    patterns.push(`?g ${SX_CONFIDENCE} ?conf .`, `FILTER(xsd:decimal(?conf) >= ${query.minConfidence})`);
  }
  if (query.current) {
    patterns.push(...STANDING_FILTER);
  }
  return patterns;
};

/** The patterns a dimension needs beyond the statement itself, and the expression naming its group key. */
const dimension = (name: FactDimension, index: number): { patterns: string[]; expr: string } => {
  switch (name) {
    case 'predicate':
      return { patterns: [], expr: 'STR(?p)' };
    case 'subject':
      return { patterns: [], expr: entityKeyExpr('?s') };
    case 'object':
      return { patterns: [], expr: entityKeyExpr('?o') };
    case 'entity':
      // Bound by the UNION the aggregate wraps the statement in; both branches bind `?term`.
      return { patterns: [], expr: entityKeyExpr('?term') };
    case 'source':
      return { patterns: [`?g ${PROV_DERIVED_FROM} ?source${index} .`], expr: `STR(?source${index})` };
    case 'agent':
      return { patterns: [`?g ${PROV_ATTRIBUTED_TO} ?agent${index} .`], expr: entityKeyExpr(`?agent${index}`) };
    case 'factuality':
      return { patterns: [`?g ${SX_FACTUALITY} ?value${index} .`], expr: `STR(?value${index})` };
    case 'force':
      return {
        patterns: [`OPTIONAL { ?g ${SX_FORCE} ?force${index} . }`],
        // Both arms are wrapped in STR: the compiler rejects a COALESCE mixing a string with an interned term.
        expr: `COALESCE(STR(?force${index}), STR(${JSON.stringify(DEFAULT_FORCE)}))`,
      };
  }
};

/**
 * SPARQL grouping the matching statements by one or two dimensions, busiest first. `entity` counts a statement
 * once per position the entity holds, so the statement is wrapped in a UNION binding `?term` to the subject and
 * to the object; every other dimension reads the statement once.
 */
export const aggregateSparql = (aggregate: FactAggregate, predicates?: ReadonlySet<string>): string => {
  const { by, scope = {}, limit } = aggregate;
  const statement = statementPatterns(scope, predicates);
  const dimensions = by.map((name, index) => dimension(name, index));
  const body = by.includes('entity')
    ? [
        '{',
        `  { ${statement.join(' ')} BIND(?s AS ?term) }`,
        '  UNION',
        `  { ${statement.join(' ')} BIND(?o AS ?term) }`,
        '}',
        'FILTER(isIRI(?term))',
      ]
    : statement;
  const binds = dimensions.map((entry, index) => `BIND(${entry.expr} AS ?k${index})`);
  const keys = dimensions.map((_entry, index) => `?k${index}`);
  return [
    'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>',
    `SELECT ${keys.join(' ')} (COUNT(*) AS ?n) WHERE {`,
    ...[...body, ...dimensions.flatMap((entry) => entry.patterns), ...binds].map((line) => `  ${line}`),
    '}',
    `GROUP BY ${keys.join(' ')}`,
    'ORDER BY DESC(?n)',
    ...(limit === undefined ? [] : [`LIMIT ${Math.max(0, Math.trunc(limit))}`]),
  ].join('\n');
};

/** SPARQL counting the statements a query matches, exactly (no graph over-reach). */
export const countSparql = (query: SemanticQuery, predicates?: ReadonlySet<string>): string =>
  [
    'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>',
    'SELECT (COUNT(*) AS ?n) WHERE {',
    ...statementPatterns(query, predicates).map((line) => `  ${line}`),
    '}',
  ].join('\n');

/**
 * SPARQL for the display label of each entity key: the `rdfs:label` stated inside the graph that mentions it.
 * One representative label per key (the lexically smallest), since graphs may label the same slug differently.
 */
export const entityLabelsSparql = (keys: readonly string[]): string => {
  const matches = keys.map((key) => isEntity('?e', key)).join(' || ');
  return [
    `SELECT ?k (MIN(?label) AS ?label) WHERE {`,
    `  GRAPH ?g { ?e ${iriRef(Vocab.RDFS_LABEL)} ?label }`,
    `  FILTER(?g != ${ONTOLOGY})`,
    ...(keys.length === 0 ? ['  FILTER(false)'] : [`  FILTER(${matches})`]),
    `  BIND(${entityKeyExpr('?e')} AS ?k)`,
    '}',
    'GROUP BY ?k',
  ].join('\n');
};

/** A percent-encoded slug read back from an IRI; an unencodable value (a literal, a foreign IRI) is left as is. */
export const decodeKey = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};
