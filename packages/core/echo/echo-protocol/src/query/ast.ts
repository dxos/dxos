//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';

import { EID, EntityId, URI } from '@dxos/keys';

import { ForeignKey } from '../foreign-key';

// Type identifier URI — either a DXN (typename) or an EID (stored-schema-as-object).
// Matches the URI written into an object's `system.type` (see `getSchemaURI`). Null
// matches any type.
const TypenameSpecifier = Schema.Union([URI.Schema, Schema.Null]);

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

  id: Schema.optional(Schema.Array(EntityId)),

  /**
   * Filter by property.
   * Must not include object ID.
   */
  props: Schema.Record(
    Schema.String.annotate({ description: 'Property name' }),
    Schema.suspend(() => Filter),
  ),

  /**
   * Objects that have any of the given foreign keys.
   */
  foreignKeys: Schema.optional(Schema.Array(ForeignKey)),

  /**
   * Match objects whose meta `key` equals this fully-qualified registry key (FQN format).
   */
  metaKey: Schema.optional(Schema.String),

  /**
   * Semver range matched against the object's meta `version`.
   * Only consulted when {@link metaKey} is set. Objects with no `version` do not satisfy a version-constrained filter.
   */
  metaVersion: Schema.optional(Schema.String),

  // NOTE: Make sure to update `FilterStep.isNoop` if you change this.
});
export interface FilterObject extends Schema.Schema.Type<typeof FilterObject_> {}
export const FilterObject: Schema.Codec<FilterObject> = FilterObject_;

/**
 * Compare.
 */
const FilterCompare_ = Schema.Struct({
  type: Schema.Literal('compare'),
  operator: Schema.Literals(['eq', 'neq', 'gt', 'gte', 'lt', 'lte']),
  // Optional because the wire format cannot say otherwise: `Filter.eq(undefined)` — which is how
  // `Filter.type(T, { prop: undefined })` matches an absent property — serializes to JSON with the
  // key dropped, so the host must decode its absence back to `undefined` rather than reject.
  value: Schema.optional(Schema.Unknown),
});
export interface FilterCompare extends Schema.Schema.Type<typeof FilterCompare_> {}
export const FilterCompare: Schema.Codec<FilterCompare> = FilterCompare_;

/**
 * In.
 */
const FilterIn_ = Schema.Struct({
  type: Schema.Literal('in'),
  values: Schema.Array(Schema.Any),
});
export interface FilterIn extends Schema.Schema.Type<typeof FilterIn_> {}
export const FilterIn: Schema.Codec<FilterIn> = FilterIn_;

/**
 * In (subquery form) — membership against a value projected from a subquery's results,
 * e.g. `threadId IN (SELECT threadId FROM feed WHERE tag = 'inbox')`.
 *
 * Nested-only (like {@link FilterIn}): valid inside an `object` filter's `props`, not at
 * the query root — the planner has no selector for a standalone membership predicate.
 * The subquery may target a different scope than the parent query; it is resolved once at
 * execution time by projecting `property` from its results into a set.
 */
const FilterInQuery_ = Schema.Struct({
  type: Schema.Literal('in-query'),
  subquery: Schema.suspend(() => Query),
  property: Schema.String,
});
export interface FilterInQuery extends Schema.Schema.Type<typeof FilterInQuery_> {}
export const FilterInQuery: Schema.Codec<FilterInQuery> = FilterInQuery_;

/**
 * Contains.
 */
const FilterContains_ = Schema.Struct({
  type: Schema.Literal('contains'),
  value: Schema.Any,
});

export interface FilterContains extends Schema.Schema.Type<typeof FilterContains_> {}

/**
 * Predicate for an array property to contain the provided value.
 * Nested objects are matched using strict structural matching.
 */
export const FilterContains: Schema.Codec<FilterContains> = FilterContains_;

/**
 * Filters objects that have certain tag.
 */
const FilterTag_ = Schema.Struct({
  type: Schema.Literal('tag'),
  tag: Schema.String, // TODO(burdon): Make OR-collection?
});

export interface FilterTag extends Schema.Schema.Type<typeof FilterTag_> {}
export const FilterTag: Schema.Codec<FilterTag> = FilterTag_;

/**
 * Range.
 */
const FilterRange_ = Schema.Struct({
  type: Schema.Literal('range'),
  from: Schema.Any,
  to: Schema.Any,
});

export interface FilterRange extends Schema.Schema.Type<typeof FilterRange_> {}
export const FilterRange: Schema.Codec<FilterRange> = FilterRange_;

/**
 * Filter by system timestamp (createdAt / updatedAt).
 * Timestamps are unix milliseconds stored in the object meta index.
 */
const FilterTimestamp_ = Schema.Struct({
  type: Schema.Literal('timestamp'),
  field: Schema.Literals(['createdAt', 'updatedAt']),
  operator: Schema.Literals(['gt', 'gte', 'lt', 'lte']),
  value: Schema.Number,
});

export interface FilterTimestamp extends Schema.Schema.Type<typeof FilterTimestamp_> {}
export const FilterTimestamp: Schema.Codec<FilterTimestamp> = FilterTimestamp_;

/**
 * Filter feed items to a cursor range — cursors being the positions the position authority assigned
 * the blocks (`Feed.getCursor`). Both bounds name an item and are exclusive of it, so a reader
 * resumes with the last cursor it consumed as `begin` without re-reading that item. Only meaningful
 * against a feed scope: an automerge object has no position, so the query planner rejects this
 * filter over a space's documents.
 */
const FilterFeedCursor_ = Schema.Struct({
  type: Schema.Literal('feed-cursor'),
  /** Read after this cursor. The empty string is the start sentinel and bounds nothing. */
  begin: Schema.optional(Schema.String),
  /** Read up to but not including this cursor. */
  end: Schema.optional(Schema.String),
  /**
   * Take the window from the end of the range rather than the start, so a pushed-down limit keeps
   * the newest items instead of the oldest. Unpositioned blocks are newer than every positioned
   * one, so an unbounded-above tail read admits them; bounding with `end` excludes them again.
   */
  tail: Schema.optional(Schema.Boolean),
});

export interface FilterFeedCursor extends Schema.Schema.Type<typeof FilterFeedCursor_> {}
export const FilterFeedCursor: Schema.Codec<FilterFeedCursor> = FilterFeedCursor_;

/**
 * Text search.
 */
const FilterTextSearch_ = Schema.Struct({
  type: Schema.Literal('text-search'),
  text: Schema.String,
  searchKind: Schema.optional(Schema.Literals(['full-text', 'vector'])),
});

export interface FilterTextSearch extends Schema.Schema.Type<typeof FilterTextSearch_> {}
export const FilterTextSearch: Schema.Codec<FilterTextSearch> = FilterTextSearch_;

/**
 * Not.
 */
const FilterNot_ = Schema.Struct({
  type: Schema.Literal('not'),
  filter: Schema.suspend(() => Filter),
});

export interface FilterNot extends Schema.Schema.Type<typeof FilterNot_> {}
export const FilterNot: Schema.Codec<FilterNot> = FilterNot_;

/**
 * And.
 */
const FilterAnd_ = Schema.Struct({
  type: Schema.Literal('and'),
  filters: Schema.Array(Schema.suspend(() => Filter)),
});

export interface FilterAnd extends Schema.Schema.Type<typeof FilterAnd_> {}
export const FilterAnd: Schema.Codec<FilterAnd> = FilterAnd_;

/**
 * Or.
 */
const FilterOr_ = Schema.Struct({
  type: Schema.Literal('or'),
  filters: Schema.Array(Schema.suspend(() => Filter)),
});

export interface FilterOr extends Schema.Schema.Type<typeof FilterOr_> {}
export const FilterOr: Schema.Codec<FilterOr> = FilterOr_;

/**
 * Filter objects that are children of the specified parents.
 * With transitive=true (default), matches grandchildren and beyond.
 */
const FilterChildOf_ = Schema.Struct({
  type: Schema.Literal('child-of'),
  /** Parent DXNs to match children of. */
  parents: Schema.Array(EID.Schema),
  /** Whether to match transitively (grandchildren, etc.). Defaults to true. */
  transitive: Schema.Boolean,
});

export interface FilterChildOf extends Schema.Schema.Type<typeof FilterChildOf_> {}
export const FilterChildOf: Schema.Codec<FilterChildOf> = FilterChildOf_;

/**
 * Filter objects by whether they have a parent at all, regardless of which object it is.
 * The parent lives on the object's own structure (`system.parent`), so this is a local predicate —
 * no traversal, unlike {@link FilterChildOf}.
 */
const FilterHasParent_ = Schema.Struct({
  type: Schema.Literal('has-parent'),
  /** True matches objects with a parent; false matches unparented (root) objects. */
  value: Schema.Boolean,
});

export interface FilterHasParent extends Schema.Schema.Type<typeof FilterHasParent_> {}
export const FilterHasParent: Schema.Codec<FilterHasParent> = FilterHasParent_;

/**
 * Union of filters.
 */
export const Filter = Schema.Union([
  FilterObject,
  FilterCompare,
  FilterIn,
  FilterInQuery,
  FilterContains,
  FilterTag,
  FilterRange,
  FilterTimestamp,
  FilterFeedCursor,
  FilterTextSearch,
  FilterChildOf,
  FilterHasParent,
  FilterNot,
  FilterAnd,
  FilterOr,
]).annotate({ identifier: 'org.dxos.schema.filter' });

export type Filter = Schema.Schema.Type<typeof Filter>;

/**
 * Query objects by type, id, and/or predicates.
 */
const QuerySelectClause_ = Schema.Struct({
  type: Schema.Literal('select'),
  filter: Schema.suspend(() => Filter),
});

export interface QuerySelectClause extends Schema.Schema.Type<typeof QuerySelectClause_> {}
export const QuerySelectClause: Schema.Codec<QuerySelectClause> = QuerySelectClause_;

/**
 * Filter objects from selection.
 */
const QueryFilterClause_ = Schema.Struct({
  type: Schema.Literal('filter'),
  selection: Schema.suspend(() => Query),
  filter: Schema.suspend(() => Filter),
});

export interface QueryFilterClause extends Schema.Schema.Type<typeof QueryFilterClause_> {}
export const QueryFilterClause: Schema.Codec<QueryFilterClause> = QueryFilterClause_;

/**
 * Traverse references from an anchor object.
 */
const QueryReferenceTraversalClause_ = Schema.Struct({
  type: Schema.Literal('reference-traversal'),
  anchor: Schema.suspend(() => Query),
  property: Schema.String, // TODO(dmaretskyi): Change to EscapedPropPath.
});

export interface QueryReferenceTraversalClause extends Schema.Schema.Type<typeof QueryReferenceTraversalClause_> {}
export const QueryReferenceTraversalClause: Schema.Codec<QueryReferenceTraversalClause> =
  QueryReferenceTraversalClause_;

/**
 * Traverse incoming references to an anchor object.
 */
const QueryIncomingReferencesClause_ = Schema.Struct({
  type: Schema.Literal('incoming-references'),
  anchor: Schema.suspend(() => Query),
  /**
   * Property path where the reference is located.
   * If null, matches references from any property.
   */
  property: Schema.NullOr(Schema.String),
  typename: TypenameSpecifier,
});

export interface QueryIncomingReferencesClause extends Schema.Schema.Type<typeof QueryIncomingReferencesClause_> {}
export const QueryIncomingReferencesClause: Schema.Codec<QueryIncomingReferencesClause> =
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
  direction: Schema.Literals(['outgoing', 'incoming', 'both']),
  filter: Schema.optional(Schema.suspend(() => Filter)),
});

export interface QueryRelationClause extends Schema.Schema.Type<typeof QueryRelationClause_> {}
export const QueryRelationClause: Schema.Codec<QueryRelationClause> = QueryRelationClause_;

/**
 * Traverse into the source or target of a relation.
 */
const QueryRelationTraversalClause_ = Schema.Struct({
  type: Schema.Literal('relation-traversal'),
  anchor: Schema.suspend(() => Query),
  direction: Schema.Literals(['source', 'target', 'both']),
});

export interface QueryRelationTraversalClause extends Schema.Schema.Type<typeof QueryRelationTraversalClause_> {}
export const QueryRelationTraversalClause: Schema.Codec<QueryRelationTraversalClause> = QueryRelationTraversalClause_;

/**
 * Traverse parent-child hierarchy.
 */
const QueryHierarchyTraversalClause_ = Schema.Struct({
  type: Schema.Literal('hierarchy-traversal'),
  anchor: Schema.suspend(() => Query),
  /**
   * to-parent: traverse from child to parent.
   * to-children: traverse from parent to children.
   */
  direction: Schema.Literals(['to-parent', 'to-children']),
});

export interface QueryHierarchyTraversalClause extends Schema.Schema.Type<typeof QueryHierarchyTraversalClause_> {}
export const QueryHierarchyTraversalClause: Schema.Codec<QueryHierarchyTraversalClause> =
  QueryHierarchyTraversalClause_;

/**
 * Union of multiple queries.
 */
const QueryUnionClause_ = Schema.Struct({
  type: Schema.Literal('union'),
  queries: Schema.Array(Schema.suspend(() => Query)),
});

export interface QueryUnionClause extends Schema.Schema.Type<typeof QueryUnionClause_> {}
export const QueryUnionClause: Schema.Codec<QueryUnionClause> = QueryUnionClause_;

/**
 * Set difference of two queries.
 */
const QuerySetDifferenceClause_ = Schema.Struct({
  type: Schema.Literal('set-difference'),
  source: Schema.suspend(() => Query),
  exclude: Schema.suspend(() => Query),
});

export interface QuerySetDifferenceClause extends Schema.Schema.Type<typeof QuerySetDifferenceClause_> {}
export const QuerySetDifferenceClause: Schema.Codec<QuerySetDifferenceClause> = QuerySetDifferenceClause_;

export const OrderDirection = Schema.Literals(['asc', 'desc']);
export type OrderDirection = Schema.Schema.Type<typeof OrderDirection>;

const Order_ = Schema.Union([
  Schema.Struct({
    // How the database wants to order them by default. For non-feed sources this is by id;
    // for feed sources this is insertion order, so `desc` gives newest-first head reads.
    kind: Schema.Literal('natural'),
    direction: OrderDirection,
  }),
  Schema.Struct({
    kind: Schema.Literal('property'),
    property: Schema.String,
    direction: OrderDirection,
  }),
  Schema.Struct({
    // Order by relevance rank (for FTS/vector search results).
    // Default direction is 'desc' (higher rank = better match first).
    kind: Schema.Literal('rank'),
    direction: OrderDirection,
  }),
  Schema.Struct({
    // Order by system timestamp (createdAt / updatedAt) from the object meta index.
    kind: Schema.Literal('timestamp'),
    field: Schema.Literals(['createdAt', 'updatedAt']),
    direction: OrderDirection,
  }),
]);

export type Order = Schema.Schema.Type<typeof Order_>;
export const Order: Schema.Codec<Order> = Order_;

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
export const QueryOrderClause: Schema.Codec<QueryOrderClause> = QueryOrderClause_;

/**
 * Add options to a query.
 */
const QueryOptionsClause_ = Schema.Struct({
  type: Schema.Literal('options'),
  query: Schema.suspend(() => Query),
  options: Schema.suspend(() => QueryOptions),
});

export interface QueryOptionsClause extends Schema.Schema.Type<typeof QueryOptionsClause_> {}
export const QueryOptionsClause: Schema.Codec<QueryOptionsClause> = QueryOptionsClause_;

/**
 * Limit the number of results.
 */
const QueryLimitClause_ = Schema.Struct({
  type: Schema.Literal('limit'),
  query: Schema.suspend(() => Query),
  limit: Schema.Number,
});

export interface QueryLimitClause extends Schema.Schema.Type<typeof QueryLimitClause_> {}
export const QueryLimitClause: Schema.Codec<QueryLimitClause> = QueryLimitClause_;

/**
 * Skip a number of results (offset). Combined with `limit` and a `natural` order, this expresses
 * a windowed (paginated) read without any feed-specific query surface.
 */
const QuerySkipClause_ = Schema.Struct({
  type: Schema.Literal('skip'),
  query: Schema.suspend(() => Query),
  skip: Schema.Number,
});

export interface QuerySkipClause extends Schema.Schema.Type<typeof QuerySkipClause_> {}
export const QuerySkipClause: Schema.Codec<QuerySkipClause> = QuerySkipClause_;

/**
 * A named aggregate computed per group over its members, exposed as a top-level field on the flat
 * result record (`row[name]`) and orderable via a following `orderBy(Order.property(name))`. A
 * tagged union per kind — `property`/`limit`/`order` are present exactly when the kind uses them,
 * so read sites narrow by `kind` instead of guarding an unused optional field.
 * - `group` partitions members by a scalar key; its coerced key value is the field's value.
 *   Composite keys are formed from multiple `group` entries. A query with no `group` entries
 *   aggregates its entire input into a single row.
 * - `max`/`min` reduce a scalar member `property`.
 * - `items` collects the group's members, optionally ordered by `order` and capped to `limit`.
 *   Opt-in — a row carries no members otherwise. `order` is this aggregate's own per-group
 *   ordering, independent of any `orderBy` clause elsewhere in the query (which orders the whole
 *   input stream / the resulting groups, not this aggregate's member selection).
 * - `count` yields the member count. Opt-in — a row carries no count otherwise.
 */
const GroupAggregateGroup_ = Schema.Struct({
  name: Schema.String,
  kind: Schema.Literal('group'),
  /**
   * Fallback chain: the first property holding a scalar value supplies this key component (`a ?? b`),
   * so a single entry is the plain property form. Composite keys come from multiple `group` entries,
   * never from this list. Non-empty — an empty chain has no key to read and would silently degrade
   * to a single `null`-keyed group.
   */
  properties: Schema.NonEmptyArray(Schema.String),
});
const GroupAggregateMax_ = Schema.Struct({ name: Schema.String, kind: Schema.Literal('max'), property: Schema.String });
const GroupAggregateMin_ = Schema.Struct({ name: Schema.String, kind: Schema.Literal('min'), property: Schema.String });
const GroupAggregateItems_ = Schema.Struct({
  name: Schema.String,
  kind: Schema.Literal('items'),
  limit: Schema.optional(Schema.Number),
  order: Schema.optional(Schema.Array(Order)),
});
const GroupAggregateCount_ = Schema.Struct({ name: Schema.String, kind: Schema.Literal('count') });

const GroupAggregate_ = Schema.Union([
  GroupAggregateGroup_,
  GroupAggregateMax_,
  GroupAggregateMin_,
  GroupAggregateItems_,
  GroupAggregateCount_,
]);

export type GroupAggregate = Schema.Schema.Type<typeof GroupAggregate_>;
export const GroupAggregate: Schema.Codec<GroupAggregate> = GroupAggregate_;

/**
 * Aggregates results into flat records. `group`-kind entries partition members into contiguous
 * groups (one row each); with no `group` entries the whole input aggregates into a single row.
 * Groups are ordered by the first occurrence of their key in the incoming (already-ordered) result
 * stream — this lets a preceding `orderBy` also control group order (e.g. ordering thread groups by
 * their most recent message). A following `orderBy(Order.property(name))` referencing an aggregate
 * or group field reorders whole groups instead. Must be the outermost data clause: only
 * `from`/`options`/`order` may wrap it.
 */
const QueryAggregateClause_ = Schema.Struct({
  type: Schema.Literal('aggregate'),
  query: Schema.suspend(() => Query),
  aggregates: Schema.Array(GroupAggregate),
});

export interface QueryAggregateClause extends Schema.Schema.Type<typeof QueryAggregateClause_> {}
export const QueryAggregateClause: Schema.Codec<QueryAggregateClause> = QueryAggregateClause_;

export const QueryFromClause_ = Schema.Struct({
  type: Schema.Literal('from'),
  query: Schema.suspend(() => Query),
  from: Schema.Union([
    Schema.TaggedStruct('scope', {
      scopes: Schema.Array(Schema.suspend(() => Scope)),
    }),
    Schema.TaggedStruct('query', {
      query: Schema.suspend(() => Query),
    }),
  ]),
});
export interface QueryFromClause extends Schema.Schema.Type<typeof QueryFromClause_> {}
export const QueryFromClause: Schema.Codec<QueryFromClause> = QueryFromClause_;

const Query_ = Schema.Union([
  QuerySelectClause,
  QueryFilterClause,
  QueryReferenceTraversalClause,
  QueryIncomingReferencesClause,
  QueryRelationClause,
  QueryRelationTraversalClause,
  QueryHierarchyTraversalClause,
  QueryUnionClause,
  QuerySetDifferenceClause,
  QueryOrderClause,
  QueryOptionsClause,
  QueryLimitClause,
  QuerySkipClause,
  QueryAggregateClause,
  QueryFromClause,
]).annotate({ identifier: 'org.dxos.schema.query' });

export type Query = Schema.Schema.Type<typeof Query_>;
export const Query: Schema.Codec<Query> = Query_;

export const QueryOptions = Schema.Struct({
  /**
   * Nested select statements will use this option to filter deleted objects.
   */
  deleted: Schema.optional(Schema.Literals(['include', 'exclude', 'only'])),

  /**
   * Diagnostics-only label for logs / tooling (not used by execution semantics).
   */
  debugLabel: Schema.optional(Schema.String),
});

export interface QueryOptions extends Schema.Schema.Type<typeof QueryOptions> {}

/**
 * Selects from a space (automerge documents).
 * When `spaceId` is omitted, targets the owning space — i.e. the space of whichever
 * database executes the query. This lets callers reference "this space" without
 * having to look up its id.
 * When `includeAllFeeds` is true, also selects from all feeds belonging to that space.
 */
export const SpaceScope = Schema.TaggedStruct('space', {
  spaceId: Schema.optional(Schema.String),
  includeAllFeeds: Schema.optional(Schema.Boolean),
});
export interface SpaceScope extends Schema.Schema.Type<typeof SpaceScope> {}

/**
 * Selects from a specific feed (by its underlying queue DXN).
 */
export const FeedScope = Schema.TaggedStruct('feed', {
  feedUri: Schema.String,
});
export interface FeedScope extends Schema.Schema.Type<typeof FeedScope> {}

/**
 * Selects from a code-shipped object registry.
 *
 * - `'local'`  — the in-process registry attached to the hypergraph.
 * - `'remote'` — a future remote registry service (not yet implemented).
 *
 * To include both, add two separate `RegistryScope` entries to the `scopes` array.
 */
export const RegistryScope = Schema.TaggedStruct('registry', {
  location: Schema.Literals(['local', 'remote']),
});
export interface RegistryScope extends Schema.Schema.Type<typeof RegistryScope> {}

/**
 * Specifies the scope of the data to query from.
 * A `from` clause may carry multiple scopes; results are unioned across them.
 */
export const Scope = Schema.Union([SpaceScope, FeedScope, RegistryScope]);
export type Scope = Schema.Schema.Type<typeof Scope>;

export const visit = (query: Query, visitor: (node: Query) => void) => {
  visitor(query);

  Match.value(query).pipe(
    Match.when({ type: 'filter' }, ({ selection }) => visit(selection, visitor)),
    Match.when({ type: 'reference-traversal' }, ({ anchor }) => visit(anchor, visitor)),
    Match.when({ type: 'incoming-references' }, ({ anchor }) => visit(anchor, visitor)),
    Match.when({ type: 'relation' }, ({ anchor }) => visit(anchor, visitor)),
    Match.when({ type: 'options' }, ({ query }) => visit(query, visitor)),
    Match.when({ type: 'relation-traversal' }, ({ anchor }) => visit(anchor, visitor)),
    Match.when({ type: 'hierarchy-traversal' }, ({ anchor }) => visit(anchor, visitor)),
    Match.when({ type: 'union' }, ({ queries }) => queries.forEach((q) => visit(q, visitor))),
    Match.when({ type: 'set-difference' }, ({ source, exclude }) => {
      visit(source, visitor);
      visit(exclude, visitor);
    }),
    Match.when({ type: 'order' }, ({ query }) => visit(query, visitor)),
    Match.when({ type: 'limit' }, ({ query }) => visit(query, visitor)),
    Match.when({ type: 'skip' }, ({ query }) => visit(query, visitor)),
    Match.when({ type: 'aggregate' }, ({ query }) => visit(query, visitor)),
    Match.when({ type: 'from' }, (node) => {
      visit(node.query, visitor);
      if (node.from._tag === 'query') {
        visit(node.from.query, visitor);
      }
    }),
    Match.when({ type: 'select' }, () => {}),
    Match.exhaustive,
  );
};

/**
 * Recursively transforms a query tree bottom-up.
 * The mapper receives each node with its children already transformed.
 */
export const map = (query: Query, mapper: (node: Query) => Query): Query => {
  const mapped: Query = Match.value(query).pipe(
    Match.when({ type: 'filter' }, (node) => ({ ...node, selection: map(node.selection, mapper) })),
    Match.when({ type: 'reference-traversal' }, (node) => ({ ...node, anchor: map(node.anchor, mapper) })),
    Match.when({ type: 'incoming-references' }, (node) => ({ ...node, anchor: map(node.anchor, mapper) })),
    Match.when({ type: 'relation' }, (node) => ({ ...node, anchor: map(node.anchor, mapper) })),
    Match.when({ type: 'relation-traversal' }, (node) => ({ ...node, anchor: map(node.anchor, mapper) })),
    Match.when({ type: 'hierarchy-traversal' }, (node) => ({ ...node, anchor: map(node.anchor, mapper) })),
    Match.when({ type: 'options' }, (node) => ({ ...node, query: map(node.query, mapper) })),
    Match.when({ type: 'order' }, (node) => ({ ...node, query: map(node.query, mapper) })),
    Match.when({ type: 'limit' }, (node) => ({ ...node, query: map(node.query, mapper) })),
    Match.when({ type: 'skip' }, (node) => ({ ...node, query: map(node.query, mapper) })),
    Match.when({ type: 'aggregate' }, (node) => ({ ...node, query: map(node.query, mapper) })),
    Match.when({ type: 'from' }, (node) => ({
      ...node,
      query: map(node.query, mapper),
      ...(node.from._tag === 'query' ? { from: { _tag: 'query' as const, query: map(node.from.query, mapper) } } : {}),
    })),
    Match.when({ type: 'union' }, (node) => ({ ...node, queries: node.queries.map((q) => map(q, mapper)) })),
    Match.when({ type: 'set-difference' }, (node) => ({
      ...node,
      source: map(node.source, mapper),
      exclude: map(node.exclude, mapper),
    })),
    Match.when({ type: 'select' }, (node) => node),
    Match.exhaustive,
  );
  return mapper(mapped);
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
    Match.when({ type: 'hierarchy-traversal' }, ({ anchor }) => fold(anchor, reducer)),
    Match.when({ type: 'union' }, ({ queries }) => queries.flatMap((q) => fold(q, reducer))),
    Match.when({ type: 'set-difference' }, ({ source, exclude }) =>
      fold(source, reducer).concat(fold(exclude, reducer)),
    ),
    Match.when({ type: 'order' }, ({ query }) => fold(query, reducer)),
    Match.when({ type: 'limit' }, ({ query }) => fold(query, reducer)),
    Match.when({ type: 'skip' }, ({ query }) => fold(query, reducer)),
    Match.when({ type: 'aggregate' }, ({ query }) => fold(query, reducer)),
    Match.when({ type: 'from' }, (node) => {
      const results = fold(node.query, reducer);
      if (node.from._tag === 'query') {
        return results.concat(fold(node.from.query, reducer));
      }
      return results;
    }),
    Match.when({ type: 'select' }, () => []),
    Match.exhaustive,
  );
};
