//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { DXN, ForeignKeySchema } from '@dxos/echo-schema';
import { ObjectId } from '@dxos/keys';

const TypenameSpecifier = Schema.Union(DXN, Schema.Null).annotations({
  description: 'DXN or null. Null means any type will match',
});

// NOTE: This pattern with 3 definitions per schema is need to make the types opaque, and circular references in AST to not cause compiler errors.

/**
 * Filter by object type and properties.
 *
 * Clauses are combined using logical AND.
 */
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
  foreignKeys: Schema.optional(Schema.Array(ForeignKeySchema)),
});
export interface FilterObject extends Schema.Schema.Type<typeof FilterObject_> {}
export const FilterObject: Schema.Schema<FilterObject> = FilterObject_;

const FilterCompare_ = Schema.Struct({
  type: Schema.Literal('compare'),
  operator: Schema.Literal('eq', 'neq', 'gt', 'gte', 'lt', 'lte'),
  value: Schema.Unknown,
});
interface FilterCompare extends Schema.Schema.Type<typeof FilterCompare_> {}
const FilterCompare: Schema.Schema<FilterCompare> = FilterCompare_;

const FilterIn_ = Schema.Struct({
  type: Schema.Literal('in'),
  values: Schema.Array(Schema.Any),
});
interface FilterIn extends Schema.Schema.Type<typeof FilterIn_> {}
const FilterIn: Schema.Schema<FilterIn> = FilterIn_;

const FilterRange_ = Schema.Struct({
  type: Schema.Literal('range'),
  from: Schema.Any,
  to: Schema.Any,
});
interface FilterRange extends Schema.Schema.Type<typeof FilterRange_> {}
const FilterRange: Schema.Schema<FilterRange> = FilterRange_;

const FilterTextSearch_ = Schema.Struct({
  type: Schema.Literal('text-search'),
  typename: TypenameSpecifier,
  text: Schema.String,
  searchKind: Schema.optional(Schema.Literal('full-text', 'vector')),
});
interface FilterTextSearch extends Schema.Schema.Type<typeof FilterTextSearch_> {}
const FilterTextSearch: Schema.Schema<FilterTextSearch> = FilterTextSearch_;

const FilterNot_ = Schema.Struct({
  type: Schema.Literal('not'),
  filter: Schema.suspend(() => Filter),
});
interface FilterNot extends Schema.Schema.Type<typeof FilterNot_> {}
const FilterNot: Schema.Schema<FilterNot> = FilterNot_;

const FilterAnd_ = Schema.Struct({
  type: Schema.Literal('and'),
  filters: Schema.Array(Schema.suspend(() => Filter)),
});
interface FilterAnd extends Schema.Schema.Type<typeof FilterAnd_> {}
const FilterAnd: Schema.Schema<FilterAnd> = FilterAnd_;

const FilterOr_ = Schema.Struct({
  type: Schema.Literal('or'),
  filters: Schema.Array(Schema.suspend(() => Filter)),
});
interface FilterOr extends Schema.Schema.Type<typeof FilterOr_> {}
const FilterOr: Schema.Schema<FilterOr> = FilterOr_;

export const Filter = Schema.Union(
  FilterObject,
  FilterTextSearch,
  FilterCompare,
  FilterIn,
  FilterRange,
  FilterNot,
  FilterAnd,
  FilterOr,
);
export type Filter = Schema.Schema.Type<typeof Filter>;

/**
 * Query objects by type, id, and/or predicates.
 */
const QuerySelectClause_ = Schema.Struct({
  type: Schema.Literal('select'),
  filter: Schema.suspend(() => Filter),
});
interface QuerySelectClause extends Schema.Schema.Type<typeof QuerySelectClause_> {}
const QuerySelectClause: Schema.Schema<QuerySelectClause> = QuerySelectClause_;

/**
 * Filter objects from selection.
 */
const QueryFilterClause_ = Schema.Struct({
  type: Schema.Literal('filter'),
  selection: Schema.suspend(() => Query),
  filter: Schema.suspend(() => Filter),
});
interface QueryFilterClause extends Schema.Schema.Type<typeof QueryFilterClause_> {}
const QueryFilterClause: Schema.Schema<QueryFilterClause> = QueryFilterClause_;

/**
 * Traverse references from an anchor object.
 */
const QueryReferenceTraversalClause_ = Schema.Struct({
  type: Schema.Literal('reference-traversal'),
  anchor: Schema.suspend(() => Query),
  property: Schema.String,
});
interface QueryReferenceTraversalClause extends Schema.Schema.Type<typeof QueryReferenceTraversalClause_> {}
const QueryReferenceTraversalClause: Schema.Schema<QueryReferenceTraversalClause> = QueryReferenceTraversalClause_;

/**
 * Traverse incoming references to an anchor object.
 */
const QueryIncomingReferencesClause_ = Schema.Struct({
  type: Schema.Literal('incoming-references'),
  anchor: Schema.suspend(() => Query),
  property: Schema.String,
  typename: TypenameSpecifier,
});
interface QueryIncomingReferencesClause extends Schema.Schema.Type<typeof QueryIncomingReferencesClause_> {}
const QueryIncomingReferencesClause: Schema.Schema<QueryIncomingReferencesClause> = QueryIncomingReferencesClause_;

/**
 * Traverse relations connecting to an anchor object.
 */
const QueryRelationClause_ = Schema.Struct({
  type: Schema.Literal('relation'),
  anchor: Schema.suspend(() => Query),
  direction: Schema.Literal('outgoing', 'incoming', 'both'),
  filter: Schema.optional(Schema.suspend(() => Filter)),
});
interface QueryRelationClause extends Schema.Schema.Type<typeof QueryRelationClause_> {}
const QueryRelationClause: Schema.Schema<QueryRelationClause> = QueryRelationClause_;

/**
 * Traverse into the source or target of a relation.
 */
const QueryRelationTraversalClause_ = Schema.Struct({
  type: Schema.Literal('relation-traversal'),
  anchor: Schema.suspend(() => Query),
  direction: Schema.Literal('source', 'target', 'both'),
});
interface QueryRelationTraversalClause extends Schema.Schema.Type<typeof QueryRelationTraversalClause_> {}
const QueryRelationTraversalClause: Schema.Schema<QueryRelationTraversalClause> = QueryRelationTraversalClause_;

/**
 * Union of multiple queries.
 */
const QueryUnionClause_ = Schema.Struct({
  type: Schema.Literal('union'),
  queries: Schema.Array(Schema.suspend(() => Query)),
});
interface QueryUnionClause extends Schema.Schema.Type<typeof QueryUnionClause_> {}
const QueryUnionClause: Schema.Schema<QueryUnionClause> = QueryUnionClause_;

/**
 * Add options to a query.
 */
const QueryOptionsClause_ = Schema.Struct({
  type: Schema.Literal('options'),
  query: Schema.suspend(() => Query),
  options: Schema.suspend(() => QueryOptions),
});
interface QueryOptionsClause extends Schema.Schema.Type<typeof QueryOptionsClause_> {}
const QueryOptionsClause: Schema.Schema<QueryOptionsClause> = QueryOptionsClause_;

const Query_ = Schema.Union(
  QuerySelectClause,
  QueryFilterClause,
  QueryReferenceTraversalClause,
  QueryIncomingReferencesClause,
  QueryRelationClause,
  QueryRelationTraversalClause,
  QueryUnionClause,
  QueryOptionsClause,
);

export type Query = Schema.Schema.Type<typeof Query_>;
export const Query: Schema.Schema<Query> = Query_;

export const QueryOptions = Schema.Struct({
  spaceIds: Schema.optional(Schema.Array(Schema.String)),
  deleted: Schema.optional(Schema.Literal('include', 'exclude', 'only')),
});
export interface QueryOptions extends Schema.Schema.Type<typeof QueryOptions> {}
