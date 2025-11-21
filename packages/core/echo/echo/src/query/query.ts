//
// Copyright 2025 DXOS.org
//

import type * as EffectArray from 'effect/Array';
import type * as Schema from 'effect/Schema';

import { type QueryAST } from '@dxos/echo-protocol';

import type * as Ref from '../Ref';
import type * as Type from '../Type';

import { Filter, FilterClass } from './filter';
import { type Order } from './order';
import { getTypeDXNFromSpecifier } from './util';

// TODO(dmaretskyi): Split up into interfaces for objects and relations so they can have separate verbs.
// TODO(dmaretskyi): Undirected relation traversals.
// TODO(wittjosiah): Make Filter & Query pipeable.

/**
 * All property paths inside T that are references.
 */
// TODO(dmaretskyi): Filter only properties that are references (or optional references, or unions that include references).
type RefPropKey<T> = keyof T & string;

export interface Query<T> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Query': { value: T };

  ast: QueryAST.Query;

  /**
   * Filter the current selection based on a filter.
   * @param filter - Filter to select the objects.
   * @returns Query for the selected objects.
   */
  select(filter: Filter<T>): Query<T>;
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
  source(): Query<Type.Relation.Source<T>>;

  /**
   * For a query for relations, get the target objects.
   * @returns Query for the target objects.
   */
  target(): Query<Type.Relation.Target<T>>;

  /**
   * Order the query results.
   * Orders are specified in priority order. The first order will be applied first, etc.
   * @param order - Order to sort the results.
   * @returns Query for the ordered results.
   */
  orderBy(...order: EffectArray.NonEmptyArray<Order<T>>): Query<T>;

  /**
   * Add options to a query.
   */
  options(options: QueryAST.QueryOptions): Query<T>;
}

interface QueryAPI {
  is(value: unknown): value is Query.Any;

  /** Construct a query from an ast. */
  fromAst(ast: QueryAST.Query): Query<any>;

  /**
   * Select objects based on a filter.
   * @param filter - Filter to select the objects.
   * @returns Query for the selected objects.
   */
  select<F extends Filter.Any>(filter: F): Query<Filter.Type<F>>;

  /**
   * Query for objects of a given schema.
   * @param schema - Schema of the objects.
   * @param predicates - Predicates to filter the objects.
   * @returns Query for the objects.
   *
   * Shorthand for: `Query.select(Filter.type(schema, predicates))`.
   */
  type<S extends Schema.Schema.All>(
    schema: S | string,
    predicates?: Filter.Props<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;

  /**
   * Combine results of multiple queries.
   * @param queries - Queries to combine.
   * @returns Query for the combined results.
   */
  // TODO(dmaretskyi): Rename to `combine` or `union`.
  all<T>(...queries: Query<T>[]): Query<T>;

  /**
   * Subtract one query from another.
   * @param source - Query to subtract from.
   * @param exclude - Query to subtract.
   * @returns Query for the results of the source query minus the results of the exclude query.
   */
  without<T>(source: Query<T>, exclude: Query<T>): Query<T>;
}

export declare namespace Query {
  export type Any = Query<any>;

  export type Type<Q extends Any> = Q extends Query<infer T> ? T : never;
}

// TODO(dmaretskyi): Separate object instead of statics for better devex with type errors.
class QueryClass implements Query<any> {
  private static variance: Query<any>['~Query'] = {} as Query<any>['~Query'];

  static is(value: unknown): value is Query<any> {
    return typeof value === 'object' && value !== null && '~Query' in value;
  }

  static fromAst(ast: QueryAST.Query): Query<any> {
    return new QueryClass(ast);
  }

  static select<F extends Filter.Any>(filter: F): Query<Filter.Type<F>> {
    return new QueryClass({
      type: 'select',
      filter: filter.ast,
    });
  }

  static type(schema: Schema.Schema.All | string, predicates?: Filter.Props<unknown>): Query<any> {
    return new QueryClass({
      type: 'select',
      filter: FilterClass.type(schema, predicates).ast,
    });
  }

  static all(...queries: Query<any>[]): Query<any> {
    if (queries.length === 0) {
      throw new TypeError(
        'Query.all combines results of multiple queries, to query all objects use Query.select(Filter.everything())',
      );
    }
    return new QueryClass({
      type: 'union',
      queries: queries.map((q) => q.ast),
    });
  }

  static without<T>(source: Query<T>, exclude: Query<T>): Query<T> {
    return new QueryClass({
      type: 'set-difference',
      source: source.ast,
      exclude: exclude.ast,
    });
  }

  constructor(public readonly ast: QueryAST.Query) {}

  '~Query' = QueryClass.variance;

  select(filter: Filter.Any | Filter.Props<any>): Query.Any {
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
        filter: FilterClass.props(filter).ast,
      });
    }
  }

  reference(key: string): Query.Any {
    return new QueryClass({
      type: 'reference-traversal',
      anchor: this.ast,
      property: key,
    });
  }

  referencedBy(target: Schema.Schema.All | string, key: string): Query.Any {
    const dxn = getTypeDXNFromSpecifier(target);
    return new QueryClass({
      type: 'incoming-references',
      anchor: this.ast,
      property: key,
      typename: dxn.toString(),
    });
  }

  sourceOf(relation: Schema.Schema.All | string, predicates?: Filter.Props<unknown> | undefined): Query.Any {
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'outgoing',
      filter: FilterClass.type(relation, predicates).ast,
    });
  }

  targetOf(relation: Schema.Schema.All | string, predicates?: Filter.Props<unknown> | undefined): Query.Any {
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'incoming',
      filter: FilterClass.type(relation, predicates).ast,
    });
  }

  source(): Query.Any {
    return new QueryClass({
      type: 'relation-traversal',
      anchor: this.ast,
      direction: 'source',
    });
  }

  target(): Query.Any {
    return new QueryClass({
      type: 'relation-traversal',
      anchor: this.ast,
      direction: 'target',
    });
  }

  orderBy(...order: Order<any>[]): Query.Any {
    return new QueryClass({
      type: 'order',
      query: this.ast,
      order: order.map((o) => o.ast),
    });
  }

  options(options: QueryAST.QueryOptions): Query.Any {
    return new QueryClass({
      type: 'options',
      query: this.ast,
      options,
    });
  }
}

export const Query: QueryAPI = QueryClass;
