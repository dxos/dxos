//
// Copyright 2025 DXOS.org
//

import type * as EffectArray from 'effect/Array';
import type * as Schema from 'effect/Schema';

import { type QueryAST } from '@dxos/echo-protocol';

import * as Filter from './Filter';
import { getTypeDXNFromSpecifier } from './internal';
import type * as Order from './Order';
import type * as Ref from './Ref';
import type * as Type$ from './Type';

// TODO(dmaretskyi): Split up into interfaces for objects and relations so they can have separate verbs.
// TODO(dmaretskyi): Undirected relation traversals.
// TODO(wittjosiah): Make Filter & Query pipeable.

/**
 * All property paths inside T that are references.
 */
// TODO(dmaretskyi): Filter only properties that are references (or optional references, or unions that include references).
type RefPropKey<T> = keyof T & string;

// TODO(burdon): Narrow T to Entity.Unknown?
export interface Query<T> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Query': { value: T };

  ast: QueryAST.Query;

  /**
   * Filter the current selection based on a filter.
   * @param filter - Filter to select the objects.
   * @returns Query for the selected objects.
   */
  select(filter: Filter.Filter<T>): Query<T>;
  select(props: Filter.Props<T>): Query<T>;

  /**
   * Traverse an outgoing reference.
   * @param key - Property path inside T that is a reference or optional reference.
   * @returns Query for the target of the reference.
   */
  reference<K extends RefPropKey<T>>(
    key: K,
  ): Query<
    T[K] extends Ref.Any
      ? Ref.Target<T[K]>
      : T[K] extends Ref.Any | undefined
        ? Ref.Target<Exclude<T[K], undefined>>
        : never
  >;

  /**
   * Find objects referencing this object.
   * @param target - Schema of the referencing object.
   * @param key - Property path inside the referencing object that is a reference.
   * @returns Query for the referencing objects.
   */
  // TODO(dmaretskyi): any way to enforce `Ref.Target<Schema.Schema.Type<S>[key]> == T`?
  // TODO(dmaretskyi): Ability to go through arrays of references.
  referencedBy<S extends Schema.Schema.All>(
    target: S | string,
    key: RefPropKey<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;

  /**
   * Find relations where this object is the source.
   * @returns Query for the relation objects.
   * @param relation - Schema of the relation.
   * @param predicates - Predicates to filter the relation objects.
   */
  sourceOf<S extends Schema.Schema.All>(
    relation: S | string,
    predicates?: Filter.Props<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;

  /**
   * Find relations where this object is the target.
   * @returns Query for the relation objects.
   * @param relation - Schema of the relation.
   * @param predicates - Predicates to filter the relation objects.
   */
  targetOf<S extends Schema.Schema.All>(
    relation: S | string,
    predicates?: Filter.Props<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;

  /**
   * For a query for relations, get the source objects.
   * @returns Query for the source objects.
   */
  source(): Query<Type$.Relation.Source<T>>;

  /**
   * For a query for relations, get the target objects.
   * @returns Query for the target objects.
   */
  target(): Query<Type$.Relation.Target<T>>;

  /**
   * Order the query results.
   * Orders are specified in priority order. The first order will be applied first, etc.
   * @param order - Order to sort the results.
   * @returns Query for the ordered results.
   */
  orderBy(...order: EffectArray.NonEmptyArray<Order.Order<T>>): Query<T>;

  /**
   * Add options to a query.
   */
  options(options: QueryAST.QueryOptions): Query<T>;
}

export type Any = Query<any>;

export type Type<Q extends Any> = Q extends Query<infer T> ? T : never;

class QueryClass implements Any {
  private static variance: Any['~Query'] = {} as Any['~Query'];

  constructor(public readonly ast: QueryAST.Query) {}

  '~Query' = QueryClass.variance;

  select(filter: Filter.Any | Filter.Props<any>): Any {
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

  reference(key: string): Any {
    return new QueryClass({
      type: 'reference-traversal',
      anchor: this.ast,
      property: key,
    });
  }

  referencedBy(target: Schema.Schema.All | string, key: string): Any {
    const dxn = getTypeDXNFromSpecifier(target);
    return new QueryClass({
      type: 'incoming-references',
      anchor: this.ast,
      property: key,
      typename: dxn.toString(),
    });
  }

  sourceOf(relation: Schema.Schema.All | string, predicates?: Filter.Props<unknown> | undefined): Any {
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'outgoing',
      filter: Filter.type(relation, predicates).ast,
    });
  }

  targetOf(relation: Schema.Schema.All | string, predicates?: Filter.Props<unknown> | undefined): Any {
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'incoming',
      filter: Filter.type(relation, predicates).ast,
    });
  }

  source(): Any {
    return new QueryClass({
      type: 'relation-traversal',
      anchor: this.ast,
      direction: 'source',
    });
  }

  target(): Any {
    return new QueryClass({
      type: 'relation-traversal',
      anchor: this.ast,
      direction: 'target',
    });
  }

  orderBy(...order: Order.Order<any>[]): Any {
    return new QueryClass({
      type: 'order',
      query: this.ast,
      order: order.map((o) => o.ast),
    });
  }

  options(options: QueryAST.QueryOptions): Any {
    return new QueryClass({
      type: 'options',
      query: this.ast,
      options,
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
export const type = (schema: Schema.Schema.All | string, predicates?: Filter.Props<unknown>): Any => {
  return new QueryClass({
    type: 'select',
    filter: Filter.type(schema, predicates).ast,
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
