//
// Copyright 2025 DXOS.org
//

import { Match, Schema } from 'effect';

import { DXN, ObjectId } from '@dxos/keys';

import { ForeignKey } from '../foreign-key';

const TypenameSpecifier = Schema.Union(DXN.Schema, Schema.Null).annotations({
  description: 'DXN or null. Null means any type will match',
});

// NOTE: This pattern with 3 definitions per schema is need to make the types opaque, and circular references in AST to not cause compiler errors.

/**
 * Filter by object type and properties.
 *
 * Clauses are combined using logical AND.
 */
// TODO(burdon): Filter object vs. relation.
const FilterObject_ = Schema.Struct({
  type: Schema.Literal('object'),

  typename: TypenameSpecifier,

  id: Schema.optional(Schema.Array(ObjectId)),

  /**
   * Filter by property.
   * Must not include object ID.
   */
  props: Schema.Record({
    key: Schema.String.annotations({ description: 'Property name' }),
    value: Schema.suspend(() => Filter),
  }),

  /**
   * Objects that have any of the given foreign keys.
   */
  foreignKeys: Schema.optional(Schema.Array(ForeignKey)),

  // NOTE: Make sure to update `FilterStep.isNoop` if you change this.
});
export interface FilterObject extends Schema.Schema.Type<typeof FilterObject_> {}
export const FilterObject: Schema.Schema<FilterObject> = FilterObject_;

const FilterCompare_ = Schema.Struct({
  type: Schema.Literal('compare'),
  operator: Schema.Literal('eq', 'neq', 'gt', 'gte', 'lt', 'lte'),
  value: Schema.Unknown,
});
export interface FilterCompare extends Schema.Schema.Type<typeof FilterCompare_> {}
export const FilterCompare: Schema.Schema<FilterCompare> = FilterCompare_;

const FilterIn_ = Schema.Struct({
  type: Schema.Literal('in'),
  values: Schema.Array(Schema.Any),
});
export interface FilterIn extends Schema.Schema.Type<typeof FilterIn_> {}
export const FilterIn: Schema.Schema<FilterIn> = FilterIn_;

const FilterContains_ = Schema.Struct({
  type: Schema.Literal('contains'),
  value: Schema.Any,
});
export interface FilterContains extends Schema.Schema.Type<typeof FilterContains_> {}
/**
 * Predicate for an array property to contain the provided value.
 * Nested objects are matched using strict structural matching.
 */
export const FilterContains: Schema.Schema<FilterContains> = FilterContains_;

const FilterRange_ = Schema.Struct({
  type: Schema.Literal('range'),
  from: Schema.Any,
  to: Schema.Any,
});
export interface FilterRange extends Schema.Schema.Type<typeof FilterRange_> {}
export const FilterRange: Schema.Schema<FilterRange> = FilterRange_;

const FilterTextSearch_ = Schema.Struct({
  type: Schema.Literal('text-search'),
  text: Schema.String,
  searchKind: Schema.optional(Schema.Literal('full-text', 'vector')),
});
export interface FilterTextSearch extends Schema.Schema.Type<typeof FilterTextSearch_> {}
export const FilterTextSearch: Schema.Schema<FilterTextSearch> = FilterTextSearch_;

const FilterNot_ = Schema.Struct({
  type: Schema.Literal('not'),
  filter: Schema.suspend(() => Filter),
});
export interface FilterNot extends Schema.Schema.Type<typeof FilterNot_> {}
export const FilterNot: Schema.Schema<FilterNot> = FilterNot_;

const FilterAnd_ = Schema.Struct({
  type: Schema.Literal('and'),
  filters: Schema.Array(Schema.suspend(() => Filter)),
});
export interface FilterAnd extends Schema.Schema.Type<typeof FilterAnd_> {}
export const FilterAnd: Schema.Schema<FilterAnd> = FilterAnd_;

const FilterOr_ = Schema.Struct({
  type: Schema.Literal('or'),
  filters: Schema.Array(Schema.suspend(() => Filter)),
});
export interface FilterOr extends Schema.Schema.Type<typeof FilterOr_> {}
export const FilterOr: Schema.Schema<FilterOr> = FilterOr_;

export const Filter = Schema.Union(
  FilterObject,
  FilterTextSearch,
  FilterCompare,
  FilterIn,
  FilterContains,
  FilterRange,
  FilterNot,
  FilterAnd,
  FilterOr,
).annotations({ identifier: 'dxos.org/schema/Filter' });
export type Filter = Schema.Schema.Type<typeof Filter>;

/**
 * Query objects by type, id, and/or predicates.
 */
const QuerySelectClause_ = Schema.Struct({
  type: Schema.Literal('select'),
  filter: Schema.suspend(() => Filter),
});
export interface QuerySelectClause extends Schema.Schema.Type<typeof QuerySelectClause_> {}
export const QuerySelectClause: Schema.Schema<QuerySelectClause> = QuerySelectClause_;

/**
 * Filter objects from selection.
 */
const QueryFilterClause_ = Schema.Struct({
  type: Schema.Literal('filter'),
  selection: Schema.suspend(() => Query),
  filter: Schema.suspend(() => Filter),
});
export interface QueryFilterClause extends Schema.Schema.Type<typeof QueryFilterClause_> {}
export const QueryFilterClause: Schema.Schema<QueryFilterClause> = QueryFilterClause_;

/**
 * Traverse references from an anchor object.
 */
const QueryReferenceTraversalClause_ = Schema.Struct({
  type: Schema.Literal('reference-traversal'),
  anchor: Schema.suspend(() => Query),
  property: Schema.String, // TODO(dmaretskyi): Change to EscapedPropPath.
});
export interface QueryReferenceTraversalClause extends Schema.Schema.Type<typeof QueryReferenceTraversalClause_> {}
export const QueryReferenceTraversalClause: Schema.Schema<QueryReferenceTraversalClause> =
  QueryReferenceTraversalClause_;

/**
 * Traverse incoming references to an anchor object.
 */
const QueryIncomingReferencesClause_ = Schema.Struct({
  type: Schema.Literal('incoming-references'),
  anchor: Schema.suspend(() => Query),
  property: Schema.String,
  typename: TypenameSpecifier,
});
export interface QueryIncomingReferencesClause extends Schema.Schema.Type<typeof QueryIncomingReferencesClause_> {}
export const QueryIncomingReferencesClause: Schema.Schema<QueryIncomingReferencesClause> =
  QueryIncomingReferencesClause_;

/**
 * Traverse relations connecting to an anchor object.
 */
const QueryRelationClause_ = Schema.Struct({
  type: Schema.Literal('relation'),
  anchor: Schema.suspend(() => Query),
  /**
   * outgoing: anchor is the source of the relation.
   * incoming: anchor is the target of the relation.
   * both: anchor is either the source or target of the relation.
   */
  direction: Schema.Literal('outgoing', 'incoming', 'both'),
  filter: Schema.optional(Schema.suspend(() => Filter)),
});
export interface QueryRelationClause extends Schema.Schema.Type<typeof QueryRelationClause_> {}
export const QueryRelationClause: Schema.Schema<QueryRelationClause> = QueryRelationClause_;

/**
 * Traverse into the source or target of a relation.
 */
const QueryRelationTraversalClause_ = Schema.Struct({
  type: Schema.Literal('relation-traversal'),
  anchor: Schema.suspend(() => Query),
  direction: Schema.Literal('source', 'target', 'both'),
});
export interface QueryRelationTraversalClause extends Schema.Schema.Type<typeof QueryRelationTraversalClause_> {}
export const QueryRelationTraversalClause: Schema.Schema<QueryRelationTraversalClause> = QueryRelationTraversalClause_;

/**
 * Union of multiple queries.
 */
const QueryUnionClause_ = Schema.Struct({
  type: Schema.Literal('union'),
  queries: Schema.Array(Schema.suspend(() => Query)),
});
export interface QueryUnionClause extends Schema.Schema.Type<typeof QueryUnionClause_> {}
export const QueryUnionClause: Schema.Schema<QueryUnionClause> = QueryUnionClause_;

/**
 * Set difference of two queries.
 */
const QuerySetDifferenceClause_ = Schema.Struct({
  type: Schema.Literal('set-difference'),
  source: Schema.suspend(() => Query),
  exclude: Schema.suspend(() => Query),
});
export interface QuerySetDifferenceClause extends Schema.Schema.Type<typeof QuerySetDifferenceClause_> {}
export const QuerySetDifferenceClause: Schema.Schema<QuerySetDifferenceClause> = QuerySetDifferenceClause_;

export const OrderDirection = Schema.Literal('asc', 'desc');
export type OrderDirection = Schema.Schema.Type<typeof OrderDirection>;

const Order_ = Schema.Union(
  Schema.Struct({
    // How database wants to order them (in practice - by id).
    kind: Schema.Literal('natural'),
  }),
  Schema.Struct({
    kind: Schema.Literal('property'),
    property: Schema.String,
    direction: OrderDirection,
  }),
);
export type Order = Schema.Schema.Type<typeof Order_>;
export const Order: Schema.Schema<Order> = Order_;

/**
 * Order the query results.
 * Left-to-right the orders dominate.
 */
const QueryOrderClause_ = Schema.Struct({
  type: Schema.Literal('order'),
  query: Schema.suspend(() => Query),
  order: Schema.Array(Order),
});
export interface QueryOrderClause extends Schema.Schema.Type<typeof QueryOrderClause_> {}
export const QueryOrderClause: Schema.Schema<QueryOrderClause> = QueryOrderClause_;

/**
 * Add options to a query.
 */
const QueryOptionsClause_ = Schema.Struct({
  type: Schema.Literal('options'),
  query: Schema.suspend(() => Query),
  options: Schema.suspend(() => QueryOptions),
});
export interface QueryOptionsClause extends Schema.Schema.Type<typeof QueryOptionsClause_> {}
export const QueryOptionsClause: Schema.Schema<QueryOptionsClause> = QueryOptionsClause_;

const Query_ = Schema.Union(
  QuerySelectClause,
  QueryFilterClause,
  QueryReferenceTraversalClause,
  QueryIncomingReferencesClause,
  QueryRelationClause,
  QueryRelationTraversalClause,
  QueryUnionClause,
  QuerySetDifferenceClause,
  QueryOrderClause,
  QueryOptionsClause,
).annotations({ identifier: 'dxos.org/schema/Query' });

export type Query = Schema.Schema.Type<typeof Query_>;
export const Query: Schema.Schema<Query> = Query_;

export const QueryOptions = Schema.Struct({
  /**
   * The nested select statemets will select from the given spaces.
   *
   * NOTE: Spaces and queues are unioned together if both are specified.
   */
  spaceIds: Schema.optional(Schema.Array(Schema.String)),

  /**
   * The nested select statemets will select from the given queues.
   *
   * NOTE: Spaces and queues are unioned together if both are specified.
   */
  queues: Schema.optional(Schema.Array(DXN.Schema)),

  /**
   * Nested select statements will use this option to filter deleted objects.
   */
  deleted: Schema.optional(Schema.Literal('include', 'exclude', 'only')),
});
export interface QueryOptions extends Schema.Schema.Type<typeof QueryOptions> {}

export const visit = (query: Query, visitor: (node: Query) => void) => {
  visitor(query);

  Match.value(query).pipe(
    Match.when({ type: 'filter' }, ({ selection }) => visit(selection, visitor)),
    Match.when({ type: 'reference-traversal' }, ({ anchor }) => visit(anchor, visitor)),
    Match.when({ type: 'incoming-references' }, ({ anchor }) => visit(anchor, visitor)),
    Match.when({ type: 'relation' }, ({ anchor }) => visit(anchor, visitor)),
    Match.when({ type: 'options' }, ({ query }) => visit(query, visitor)),
    Match.when({ type: 'relation-traversal' }, ({ anchor }) => visit(anchor, visitor)),
    Match.when({ type: 'union' }, ({ queries }) => queries.forEach((q) => visit(q, visitor))),
    Match.when({ type: 'set-difference' }, ({ source, exclude }) => {
      visit(source, visitor);
      visit(exclude, visitor);
    }),
    Match.when({ type: 'order' }, ({ query }) => visit(query, visitor)),
    Match.when({ type: 'select' }, () => {}),
    Match.exhaustive,
  );
};

export const fold = <T>(query: Query, reducer: (node: Query) => T): T[] => {
  return Match.value(query).pipe(
    Match.withReturnType<T[]>(),
    Match.when({ type: 'filter' }, ({ selection }) => fold(selection, reducer)),
    Match.when({ type: 'reference-traversal' }, ({ anchor }) => fold(anchor, reducer)),
    Match.when({ type: 'incoming-references' }, ({ anchor }) => fold(anchor, reducer)),
    Match.when({ type: 'relation' }, ({ anchor }) => fold(anchor, reducer)),
    Match.when({ type: 'options' }, ({ query }) => fold(query, reducer)),
    Match.when({ type: 'relation-traversal' }, ({ anchor }) => fold(anchor, reducer)),
    Match.when({ type: 'union' }, ({ queries }) => queries.flatMap((q) => fold(q, reducer))),
    Match.when({ type: 'set-difference' }, ({ source, exclude }) =>
      fold(source, reducer).concat(fold(exclude, reducer)),
    ),
    Match.when({ type: 'order' }, ({ query }) => fold(query, reducer)),
    Match.when({ type: 'select' }, () => []),
    Match.exhaustive,
  );
};
