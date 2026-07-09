//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as EffectArray from 'effect/Array';
import type * as Schema from 'effect/Schema';

import { type QueryAST } from '@dxos/echo-protocol';
import { EID, type URI } from '@dxos/keys';

import type * as Aggregate from './Aggregate';
import type * as Collection from './Collection';
import * as Database from './Database';
import type * as Dataset from './Dataset';
import type * as Feed from './Feed';
import * as Filter from './Filter';
import * as internal from './internal';
import * as Obj from './Obj';
import type * as Order from './Order';
import type * as Ref from './Ref';
import type * as Relation from './Relation';
// eslint-disable-next-line @dxos/rules/import-as-namespace
import type * as Type$ from './Type';
import type * as View from './View';

// TODO(dmaretskyi): Split up into interfaces for objects and relations so they can have separate verbs.
// TODO(dmaretskyi): Undirected relation traversals.
// TODO(wittjosiah): Make Filter & Query pipeable.

/**
 * All property paths inside T that are references.
 */
// TODO(dmaretskyi): Filter only properties that are references (or optional references, or unions that include references).
type RefPropKey<T> = keyof T & string;

type RefArrayElement<A> = A extends readonly (infer E)[] ? E : A extends (infer E)[] ? E : never;

/** Target entity when traversing an outgoing ref or array-of-refs property. */
type ReferenceTraversalTarget<P> = P extends Ref.Unknown
  ? Ref.Target<P>
  : P extends Ref.Unknown | undefined
    ? Ref.Target<Exclude<P, undefined>>
    : RefArrayElement<P> extends Ref.Unknown
      ? Ref.Target<RefArrayElement<P>>
      : never;

/**
 * Phantom brand on the flat row produced by {@link Query.aggregate}. Present only at the type level
 * (never at runtime), it lets hooks like `useQuery`/`usePagination` distinguish an aggregate-row
 * query from an entity query and avoid wrapping the row in `Entity.Entity`. The brand is a required
 * property so `T extends AggregateResult` discriminates — an optional one would be satisfied by any
 * type. Consumers never read it.
 */
export interface AggregateResult {
  readonly '~@dxos/echo/Query.AggregateResult': true;
}

// TODO(burdon): Narrow T to Entity.Unknown?
export interface Query<T> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Query': { value: T };

  'ast': QueryAST.Query;

  /**
   * Filter the current selection based on a filter.
   * @param filter - Filter to select the objects.
   * @returns Query for the selected objects.
   */
  'select'(filter: Filter.Filter<T>): Query<T>;
  'select'(props: Filter.Props<T>): Query<T>;

  /**
   * Traverse an outgoing reference.
   * @param key - Property path inside T that is a reference or optional reference.
   * @returns Query for the target of the reference.
   */
  'reference'<K extends RefPropKey<T>>(key: K): Query<ReferenceTraversalTarget<T[K]>>;

  /**
   * Find objects referencing this object.
   * @param target - Schema of the referencing object. If not provided, matches any type.
   * @param key - Property path inside the referencing object that is a reference. If not provided, matches any property.
   * @returns Query for the referencing objects.
   */
  // TODO(dmaretskyi): any way to enforce `Ref.Target<Schema.Schema.Type<S>[key]> == T`?
  // TODO(dmaretskyi): Ability to go through arrays of references.
  'referencedBy'<S extends Type$.AnyEntity>(
    target: S | URI.URI,
    key: RefPropKey<Type$.InstanceType<S>>,
  ): Query<Type$.InstanceType<S>>;
  'referencedBy'<S extends Type$.AnyEntity>(target: S | URI.URI): Query<Type$.InstanceType<S>>;
  'referencedBy'(): Query<any>;

  /**
   * Find relations where this object is the source.
   * @returns Query for the relation objects.
   * @param relation - Schema of the relation.
   * @param predicates - Predicates to filter the relation objects.
   */
  'sourceOf'<R extends Type$.AnyRelation>(
    relation?: R | URI.URI,
    predicates?: Filter.Props<Type$.InstanceType<R>>,
  ): Query<Type$.InstanceType<R>>;

  /**
   * Find relations where this object is the target.
   * @returns Query for the relation objects.
   * @param relation - Type entity of the relation.
   * @param predicates - Predicates to filter the relation objects.
   */
  'targetOf'<R extends Type$.AnyRelation>(
    relation?: R | URI.URI,
    predicates?: Filter.Props<Type$.InstanceType<R>>,
  ): Query<Type$.InstanceType<R>>;

  /**
   * For a query for relations, get the source objects.
   * @returns Query for the source objects.
   */
  'source'(): Query<Relation.SourceOf<T>>;

  /**
   * For a query for relations, get the target objects.
   * @returns Query for the target objects.
   */
  'target'(): Query<Relation.TargetOf<T>>;

  /**
   * Get the parent object of the current selection.
   * @returns Query for the parent objects.
   */
  'parent'(): Query<any>;

  /**
   * Get all child objects of the current selection.
   * @returns Query for the child objects.
   */
  'children'(): Query<any>;

  /**
   * Order the query results.
   * Orders are specified in priority order. The first order will be applied first, etc.
   *
   * `Order.property` orders by the current result shape's fields, so it works both before and after
   * an {@link aggregate}: before, by member (row) properties; after, by the flat record's fields
   * (any group or aggregate field — e.g. `Order.property('lastMessageAt')` reorders the groups by
   * that aggregate).
   * @param order - Order to sort the results.
   * @returns Query for the ordered results.
   */
  'orderBy'(...order: EffectArray.NonEmptyArray<Order.Order<T>>): Query<T>;

  /**
   * Aggregate the query results into flat records. {@link Aggregate.group} entries partition the
   * results into contiguous groups (one record each), keyed by the record field the group is named
   * after; with no `group` entries the entire input aggregates into a single record. Each declared
   * aggregate becomes a top-level field and can be ordered by with a following {@link orderBy} using
   * {@link Order.property}.
   *
   * Groups are ordered by the first occurrence of their key in the incoming stream, so a preceding
   * `orderBy` controls group order too. For example, message threads ordered by their most recent
   * message, each retaining up to 20 members newest-first:
   *
   * ```ts
   * Query.type(Message)
   *   .orderBy(Order.property('created', 'desc'))
   *   .aggregate({
   *     threadId: Aggregate.group('threadId'),
   *     lastMessageAt: Aggregate.max('created'),
   *     items: Aggregate.items({ limit: 20 }),
   *   })
   *   .orderBy(Order.property('lastMessageAt', 'desc'));
   * ```
   *
   * Must be the last data-selecting clause in the chain — only `from`/`options`/`orderBy`/`limit`/
   * `skip` may follow.
   * @param aggregates - Record of aggregate declarations keyed by result field name.
   * @returns Query whose flat result records carry the named aggregates as fields.
   */
  'aggregate'<const A extends Record<string, Aggregate.Aggregate<T, any>>>(
    aggregates: A,
  ): Query<Aggregate.AggregationResult<A>>;

  /**
   * Limit the number of results.
   * @param limit - Maximum number of results to return.
   * @returns Query for the limited results.
   */
  'limit'(limit: number): Query<T>;

  /**
   * Skip a number of results (offset). Combined with `orderBy` and `limit`, expresses a windowed
   * (paginated) read.
   * @param skip - Number of leading results to skip.
   * @returns Query for the remaining results.
   */
  'skip'(skip: number): Query<T>;

  /**
   * Query from selected databases only.
   *
   * Example:
   *
   * ```ts
   * Query.select(Filter.type(Person)).from(db);
   * ```
   *
   * @param options.includeFeeds [false] - Whether to include feeds in the query. Default is to query from automerge documents only.
   */
  'from'(database: Database.Database | Database.Database[], options?: { includeFeeds?: boolean }): Query<T>;

  /**
   * Query from selected feeds only.
   *
   * Example:
   *
   * ```ts
   * Query.select(Filter.type(Person)).from(feed);
   * ```
   *
   */
  'from'(feeds: Feed.Feed | Feed.Feed[]): Query<T>;

  /**
   * Query from all accessible spaces.
   *
   * Example:
   *
   * ```ts
   * Query.select(Filter.type(Person)).from('all-accessible-spaces');
   * ```
   *
   * @param options.includeFeeds [false] - Whether to include feeds in the query. Default is to query from automerge documents only.
   */
  'from'(allSpaces: 'all-accessible-spaces', options?: { includeFeeds?: boolean }): Query<T>;

  /**
   * Query from a dataset.
   * Currently only feeds are supported.
   *
   * Example:
   *
   * ```ts
   * Query.type(Person).from(feed);
   * ```
   */
  'from'(dataset: Dataset.Dataset): Query<T>;

  /**
   * Query from the results of another query.
   *
   * Example:
   *
   * ```ts
   * Query.select(Filter.props({ foo: 'foo' })).from(Query.select(Filter.type(Contact)).reference('org'));
   * ```
   */
  'from'(query: Any): Query<T>;

  /**
   * Query from one or more raw scopes.
   *
   * Use the {@link Scope} constructors rather than raw tagged objects:
   *
   * ```ts
   * Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry());
   * ```
   */
  'from'(...scopes: QueryAST.Scope[]): Query<T>;

  /**
   * Query from a raw scope or array of scopes.
   */
  'from'(scope: QueryAST.Scope | QueryAST.Scope[]): Query<T>;

  /**
   * Add options to a query.
   */
  'options'(options: QueryAST.QueryOptions): Query<T>;

  /**
   * Attach a diagnostic label for logs and tooling (execution semantics unchanged).
   */
  'debugLabel'(label: string): Query<T>;
}

export type Any = Query<any>;

export type Type<Q extends Any> = Q extends Query<infer T> ? T : never;

class QueryClass implements Any {
  private static 'variance': Any['~Query'] = {} as Any['~Query'];

  'constructor'(public readonly ast: QueryAST.Query) {}

  '~Query' = QueryClass.variance;

  'select'(filter: Filter.Any | Filter.Props<any>): Any {
    if (Filter.is(filter)) {
      return new QueryClass({
        type: 'filter',
        selection: this.ast,
        filter: filter.ast,
      });
    } else {
      return new QueryClass({
        type: 'filter',
        selection: this.ast,
        filter: Filter.props(filter).ast,
      });
    }
  }

  'reference'(key: string): Any {
    return new QueryClass({
      type: 'reference-traversal',
      anchor: this.ast,
      property: key,
    });
  }

  'referencedBy'(target?: Type$.AnyEntity | URI.URI, key?: string): Any {
    const uri = target !== undefined ? internal.getTypeURIFromSpecifier(target) : null;
    return new QueryClass({
      type: 'incoming-references',
      anchor: this.ast,
      property: key ?? null,
      typename: uri ?? null,
    });
  }

  'sourceOf'(relation?: Type$.AnyRelation | URI.URI, predicates?: Filter.Props<unknown> | undefined): Any {
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'outgoing',
      filter: relation !== undefined ? Filter.type(relation, predicates).ast : undefined,
    });
  }

  'targetOf'(relation?: Type$.AnyRelation | URI.URI, predicates?: Filter.Props<unknown> | undefined): Any {
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'incoming',
      filter: relation !== undefined ? Filter.type(relation, predicates).ast : undefined,
    });
  }

  'source'(): Any {
    return new QueryClass({
      type: 'relation-traversal',
      anchor: this.ast,
      direction: 'source',
    });
  }

  'target'(): Any {
    return new QueryClass({
      type: 'relation-traversal',
      anchor: this.ast,
      direction: 'target',
    });
  }

  'parent'(): Any {
    return new QueryClass({
      type: 'hierarchy-traversal',
      anchor: this.ast,
      direction: 'to-parent',
    });
  }

  'children'(): Any {
    return new QueryClass({
      type: 'hierarchy-traversal',
      anchor: this.ast,
      direction: 'to-children',
    });
  }

  'orderBy'(...order: Order.Any[]): Any {
    return new QueryClass({
      type: 'order',
      query: this.ast,
      order: order.map((o) => o.ast),
    });
  }

  'aggregate'(aggregates: Record<string, Aggregate.Any>): Any {
    return new QueryClass({
      type: 'aggregate',
      query: this.ast,
      aggregates: Object.entries(aggregates).map(([name, aggregate]) => ({ name, ...aggregate.spec })),
    });
  }

  'limit'(limit: number): Any {
    return new QueryClass({
      type: 'limit',
      query: this.ast,
      limit,
    });
  }

  'skip'(skip: number): Any {
    return new QueryClass({
      type: 'skip',
      query: this.ast,
      skip,
    });
  }

  'from'(
    ...args:
      | [
          (
            | Database.Database
            | Database.Database[]
            | Feed.Feed
            | Feed.Feed[]
            | Collection.Collection
            | View.View
            | Any
            | QueryAST.Scope
            | QueryAST.Scope[]
            | 'all-accessible-spaces'
          ),
          { includeFeeds?: boolean }?,
        ]
      | QueryAST.Scope[]
  ): Any {
    // Variadic raw scopes: `.from(Scope.space(), Scope.registry())`.
    if (args.length > 1 && args.every(_isRawScope)) {
      return new QueryClass({
        type: 'from',
        query: this.ast,
        from: { _tag: 'scope', scopes: args as QueryAST.Scope[] },
      });
    }

    const [arg, options] = args as [
      (
        | Database.Database
        | Database.Database[]
        | Feed.Feed
        | Feed.Feed[]
        | Collection.Collection
        | View.View
        | Any
        | QueryAST.Scope
        | QueryAST.Scope[]
        | 'all-accessible-spaces'
      ),
      { includeFeeds?: boolean }?,
    ];
    if (arg == null) {
      throw new TypeError(
        'Query.from() requires a valid data source argument (database, feed, query, scope, or "all-accessible-spaces").',
      );
    }

    if (is(arg)) {
      return new QueryClass({
        type: 'from',
        query: this.ast,
        from: { _tag: 'query', query: arg.ast },
      });
    }

    if (arg === 'all-accessible-spaces') {
      return new QueryClass({
        type: 'from',
        query: this.ast,
        from: { _tag: 'scope', scopes: [] },
      });
    }

    // Raw scope(s): tagged union objects with _tag 'space' | 'feed' | 'registry'.
    if (Array.isArray(arg) && arg.every(_isRawScope)) {
      return new QueryClass({
        type: 'from',
        query: this.ast,
        from: { _tag: 'scope', scopes: arg as QueryAST.Scope[] },
      });
    }
    if (_isRawScope(arg)) {
      return new QueryClass({
        type: 'from',
        query: this.ast,
        from: { _tag: 'scope', scopes: [arg] },
      });
    }

    const items = Array.isArray(arg) ? arg : [arg];

    if (items.length > 0 && Database.isDatabase(items[0])) {
      const databases = items as Database.Database[];
      return new QueryClass({
        type: 'from',
        query: this.ast,
        from: {
          _tag: 'scope',
          scopes: databases.map((db) => ({
            _tag: 'space' as const,
            spaceId: db.spaceId,
            ...(options?.includeFeeds ? { includeAllFeeds: true } : {}),
          })),
        },
      });
    }

    if (items.length > 0) {
      const typename = Obj.getTypename(items[0] as Obj.Unknown);
      // TODO(dmaretskyi): Support querying from views.
      if (typename === 'org.dxos.type.view') {
        throw new Error('Query.from(view) is not yet supported.');
      }
      // TODO(dmaretskyi): Support querying from collections.
      if (typename === 'org.dxos.type.collection') {
        throw new Error('Query.from(collection) is not yet supported.');
      }
      // Validate that the items are feed objects. Checked by typename rather than schema instanceof
      // to keep this module free of a runtime dependency on the Feed module (avoids an import cycle).
      for (const item of items) {
        const itemTypename = Obj.getTypename(item as Obj.Unknown);
        if (itemTypename !== 'org.dxos.type.feed') {
          throw new TypeError(
            `Query.from() expects Feed objects (org.dxos.type.feed), but received an object with typename '${itemTypename ?? 'unknown'}'.`,
          );
        }
      }
    }

    const feedItems = items as Feed.Feed[];
    const feedScopes = feedItems.map((feed) => {
      // Inlined Feed.getFeedUri to avoid a runtime import cycle with the Feed module.
      const uri = EID.tryParse(Obj.getURI(feed));
      if (!uri) {
        throw new TypeError(
          `Query.from() expects persisted Feed objects with a feed URI; got feed without a space (id=${Obj.getURI(feed)}).`,
        );
      }
      return { _tag: 'feed' as const, feedUri: String(uri) };
    });
    return new QueryClass({
      type: 'from',
      query: this.ast,
      from: { _tag: 'scope', scopes: feedScopes },
    });
  }

  'options'(options: QueryAST.QueryOptions): Any {
    return new QueryClass({
      type: 'options',
      query: this.ast,
      options,
    });
  }

  'debugLabel'(label: string): Any {
    if (this.ast.type === 'options') {
      return new QueryClass({
        type: 'options',
        query: this.ast.query,
        options: { ...this.ast.options, debugLabel: label },
      });
    }
    return new QueryClass({
      type: 'options',
      query: this.ast,
      options: { debugLabel: label },
    });
  }
}

export const is = (value: unknown): value is Any => {
  return typeof value === 'object' && value !== null && '~Query' in value;
};

/** Construct a query from an ast. */
export const fromAst = (ast: QueryAST.Query): Any => {
  return new QueryClass(ast);
};

/**
 * Select objects based on a filter.
 * @param filter - Filter to select the objects.
 * @returns Query for the selected objects.
 */
export const select = <F extends Filter.Any>(filter: F): Query<Filter.Type<F>> => {
  return new QueryClass({
    type: 'select',
    filter: filter.ast,
  });
};

/**
 * Query for objects of a given schema.
 * @param schema - Schema of the objects.
 * @param predicates - Predicates to filter the objects.
 * @returns Query for the objects.
 *
 * Shorthand for: `Query.select(Filter.type(schema, predicates))`.
 */
export const type: {
  <T extends Type$.AnyEntity>(type: T, predicates?: Filter.Props<Type$.InstanceType<T>>): Query<Type$.InstanceType<T>>;
  // Brand-narrowed schema overload — only well-known unknown schemas pass.
  <S extends internal.UnknownTypeSchema<any, any>>(
    schema: S,
    predicates?: Filter.Props<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;
  <S extends Schema.Union<readonly Schema.Schema.AnyNoContext[]>>(
    union: S,
    predicates?: Filter.Props<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;
  (uri: URI.URI, predicates?: Filter.Props<unknown>): Query<any>;
} = (type: Type$.AnyEntity | URI.URI, predicates?: Filter.Props<unknown>): Any => {
  return new QueryClass({
    type: 'select',
    filter: Filter.type(type, predicates).ast,
  });
};

/**
 * Combine results of multiple queries.
 * @param queries - Queries to combine.
 * @returns Query for the combined results.
 */
// TODO(dmaretskyi): Rename to `combine` or `union`.
export const all = (...queries: Any[]): Any => {
  if (queries.length === 0) {
    throw new TypeError(
      'Query.all combines results of multiple queries, to query all objects use Query.select(Filter.everything())',
    );
  }
  return new QueryClass({
    type: 'union',
    queries: queries.map((q) => q.ast),
  });
};

/**
 * Subtract one query from another.
 * @param source - Query to subtract from.
 * @param exclude - Query to subtract.
 * @returns Query for the results of the source query minus the results of the exclude query.
 */
export const without = <T>(source: Query<T>, exclude: Query<T>): Query<T> => {
  return new QueryClass({
    type: 'set-difference',
    source: source.ast,
    exclude: exclude.ast,
  });
};

/**
 * Create a query scoped to a data source.
 * The returned query selects everything from the source; chain `.select()` to narrow results.
 *
 * @param source - Data source: database, feed, 'all-accessible-spaces', or another query.
 * @returns Query scoped to the given source.
 */
export const from = (
  ...args:
    | [
        (
          | Database.Database
          | Database.Database[]
          | Feed.Feed
          | Feed.Feed[]
          | Any
          | QueryAST.Scope
          | QueryAST.Scope[]
          | 'all-accessible-spaces'
        ),
        { includeFeeds?: boolean }?,
      ]
    | QueryAST.Scope[]
): Any => {
  const baseQuery: QueryAST.Query = {
    type: 'select',
    filter: Filter.everything().ast,
  };
  const wrapper = new QueryClass(baseQuery);
  return (wrapper.from as (...args: unknown[]) => Any)(...args);
};

const SCOPE_TAGS = new Set<string>(['space', 'feed', 'registry']);

/** Detect a raw Scope tagged-union object. */
const _isRawScope = (value: unknown): value is QueryAST.Scope => {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    '_tag' in value &&
    typeof value._tag === 'string' &&
    SCOPE_TAGS.has(value._tag)
  );
};

/**
 * Returns a human-readable string representation of a Query AST.
 */
export const pretty = (query: Any): string => internal.prettyQuery(query.ast);
