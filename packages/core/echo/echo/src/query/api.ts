//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';
import type { Simplify } from 'effect/Schema';

import { raise } from '@dxos/debug';
import { getSchemaDXN, type Ref } from '@dxos/echo-schema';

import type * as QueryAST from './ast';
import type { Relation } from '..';

// TODO(dmaretskyi): Split up into interfaces for objects and relations so they can have separate verbs.
// TODO(dmaretskyi): Undirected relation traversals.

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
   * @param key - Property path inside T that is a reference.
   * @returns Query for the target of the reference.
   */
  reference<K extends RefPropKey<T>>(key: K): Query<Ref.Target<T[K]>>;

  /**
   * Find objects referencing this object.
   * @param target - Schema of the referencing object.
   * @param key - Property path inside the referencing object that is a reference.
   * @returns Query for the referencing objects.
   */
  // TODO(dmaretskyi): any way to enforce `Ref.Target<Schema.Schema.Type<S>[key]> == T`?
  referencedBy<S extends Schema.Schema.All>(
    target: S,
    key: RefPropKey<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;

  /**
   * Find relations where this object is the source.
   * @returns Query for the relation objects.
   * @param relation - Schema of the relation.
   * @param predicates - Predicates to filter the relation objects.
   */
  sourceOf<S extends Schema.Schema.All>(
    relation: S,
    predicates?: Filter.Props<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;

  /**
   * Find relations where this object is the target.
   * @returns Query for the relation objects.
   * @param relation - Schema of the relation.
   * @param predicates - Predicates to filter the relation objects.
   */
  targetOf<S extends Schema.Schema.All>(
    relation: S,
    predicates?: Filter.Props<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;

  /**
   * For a query for relations, get the source objects.
   * @returns Query for the source objects.
   */
  source(): Query<Relation.Source<T>>;

  /**
   * For a query for relations, get the target objects.
   * @returns Query for the target objects.
   */
  target(): Query<Relation.Target<T>>;
}

interface QueryAPI {
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
    schema: S,
    predicates?: Filter.Props<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;

  /**
   * Full-text or vector search.
   *
   * @deprecated Use `Filter`.
   */
  // text<S extends Schema.Schema.All>(
  //   // TODO(dmaretskyi): Allow passing an array of schema here.
  //   schema: S,
  //   // TODO(dmaretskyi): Consider passing a vector here, but really the embedding should be done on the query-executor side.
  //   text: string,
  //   options?: Query.TextSearchOptions,
  // ): Query<Schema.Schema.Type<S>>;

  /**
   * Combine results of multiple queries.
   * @param queries - Queries to combine.
   * @returns Query for the combined results.
   */
  all<T>(...queries: Query<T>[]): Query<T>;
}

export declare namespace Query {
  export type TextSearchOptions = {
    type?: 'full-text' | 'vector';
  };
}

export interface Filter<T> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Filter': { value: T };

  ast: QueryAST.Filter;
}

type Intersection<Types extends readonly unknown[]> = Types extends [infer First, ...infer Rest]
  ? First & Intersection<Rest>
  : unknown;

interface FilterAPI {
  is(value: unknown): value is Filter<any>;

  /**
   * Filter by type.
   */
  type<S extends Schema.Schema.All>(
    schema: S,
    props?: Filter.Props<Schema.Schema.Type<S>>,
  ): Filter<Schema.Schema.Type<S>>;

  /**
   * Filter by properties.
   */
  // props<T>(props: Filter.Props<T>): Filter<T>;

  /**
   * Full-text or vector search.
   */
  text<S extends Schema.Schema.All>(
    // TODO(dmaretskyi): Allow passing an array of schema here.
    schema: S,
    // TODO(dmaretskyi): Consider passing a vector here, but really the embedding should be done on the query-executor side.
    text: string,
    options?: Query.TextSearchOptions,
  ): Filter<Schema.Schema.Type<S>>;

  /**
   * Predicate for property to be equal to the provided value.
   */
  eq<T>(value: T): Filter<T>;

  /**
   * Predicate for property to be not equal to the provided value.
   */
  neq<T>(value: T): Filter<T>;

  /**
   * Predicate for property to be greater than the provided value.
   */
  gt<T>(value: T): Filter<T>;

  /**
   * Predicate for property to be greater than the provided value.
   */
  gt<T>(value: T): Filter<T>;

  /**
   * Predicate for property to be greater than or equal to the provided value.
   */
  gte<T>(value: T): Filter<T>;

  /**
   * Predicate for property to be less than the provided value.
   */
  lt<T>(value: T): Filter<T>;

  /**
   * Predicate for property to be less than or equal to the provided value.
   */
  lte<T>(value: T): Filter<T>;

  /**
   * Predicate for property to be in the provided array.
   * @param values - Values to check against.
   */
  in<T>(...values: T[]): Filter<T>;

  /**
   * Predicate for property to be in the provided range.
   * @param from - Start of the range (inclusive).
   * @param to - End of the range (exclusive).
   */
  between<T>(from: T, to: T): Filter<T>;

  /**
   * Combine filters with a logical AND.
   */
  and<FS extends Filter.Any[]>(...filters: FS): Filter<Filter.And<FS>>;

  /**
   * Combine filters with a logical OR.
   */
  or<FS extends Filter.Any[]>(...filters: FS): Filter<Filter.Or<FS>>;

  // TODO(dmaretskyi): Add `Filter.match` to support pattern matching on string props.
}

export declare namespace Filter {
  type Props<T> = {
    // Predicate or a value as a shorthand for `eq`.
    [K in keyof T & string]?: Filter<T[K]> | T[K];
  };

  type Any = Filter<any>;

  type Type<F extends Any> = F extends Filter<infer T> ? T : never;

  type And<FS extends readonly Any[]> = Simplify<Intersection<{ [K in keyof FS]: Type<FS[K]> }>>;

  type Or<FS extends readonly Any[]> = Simplify<{ [K in keyof FS]: Type<FS[K]> }[number]>;
}

class FilterClass implements Filter<any> {
  private static variance: Filter<any>['~Filter'] = {} as Filter<any>['~Filter'];

  static is(value: unknown): value is Filter<any> {
    return typeof value === 'object' && value !== null && '~Filter' in value;
  }

  static type<S extends Schema.Schema.All>(
    schema: S,
    props?: Filter.Props<Schema.Schema.Type<S>>,
  ): Filter<Schema.Schema.Type<S>> {
    const dxn = getSchemaDXN(schema) ?? raise(new TypeError('Schema has no DXN'));
    return new FilterClass({
      type: 'object',
      typename: dxn.toString(),
      props: props ? propsFilterToAst(props) : {},
    });
  }

  /**
   * Internal.
   */
  static props<T>(props: Filter.Props<T>): Filter<T> {
    return new FilterClass({
      type: 'object',
      typename: null,
      props: propsFilterToAst(props),
    });
  }

  static text<S extends Schema.Schema.All>(
    schema: S,
    text: string,
    options?: Query.TextSearchOptions,
  ): Filter<Schema.Schema.Type<S>> {
    const dxn = getSchemaDXN(schema) ?? raise(new TypeError('Schema has no DXN'));
    return new FilterClass({
      type: 'text-search',
      typename: dxn.toString(),
      text,
      searchKind: options?.type,
    });
  }

  static eq<T>(value: T): Filter<T> {
    return new FilterClass({
      type: 'compare',
      operator: 'eq',
      value,
    });
  }

  static neq<T>(value: T): Filter<T> {
    return new FilterClass({
      type: 'compare',
      operator: 'neq',
      value,
    });
  }

  static gt<T>(value: T): Filter<T> {
    return new FilterClass({
      type: 'compare',
      operator: 'gt',
      value,
    });
  }

  static gte<T>(value: T): Filter<T> {
    return new FilterClass({
      type: 'compare',
      operator: 'gte',
      value,
    });
  }

  static lt<T>(value: T): Filter<T> {
    return new FilterClass({
      type: 'compare',
      operator: 'lt',
      value,
    });
  }

  static lte<T>(value: T): Filter<T> {
    return new FilterClass({
      type: 'compare',
      operator: 'lte',
      value,
    });
  }

  static in<T>(...values: T[]): Filter<T> {
    return new FilterClass({
      type: 'in',
      values,
    });
  }

  static between<T>(from: T, to: T): Filter<T> {
    return new FilterClass({
      type: 'range',
      from,
      to,
    });
  }

  static and<T>(...filters: Filter<T>[]): Filter<T> {
    return new FilterClass({
      type: 'and',
      filters: filters.map((f) => f.ast),
    });
  }

  static or<T>(...filters: Filter<T>[]): Filter<T> {
    return new FilterClass({
      type: 'or',
      filters: filters.map((f) => f.ast),
    });
  }

  private constructor(public readonly ast: QueryAST.Filter) {}

  '~Filter' = FilterClass.variance;
}

export const Filter: FilterAPI = FilterClass;

/**
 * All property paths inside T that are references.
 */
type RefPropKey<T> = { [K in keyof T]: T[K] extends Ref<infer _U> ? K : never }[keyof T] & string;

const propsFilterToAst = (predicates: Filter.Props<any>): Record<string, QueryAST.Filter> => {
  return Object.fromEntries(
    Object.entries(predicates).map(([key, predicate]) => [
      key,
      Filter.is(predicate) ? predicate.ast : Filter.eq(predicate).ast,
    ]),
  ) as Record<string, QueryAST.Filter>;
};

class QueryClass implements Query<any> {
  private static variance: Query<any>['~Query'] = {} as Query<any>['~Query'];

  static select<F extends Filter.Any>(filter: F): Query<Filter.Type<F>> {
    return new QueryClass({
      type: 'select',
      filter: filter.ast,
    });
  }

  static type(schema: Schema.Schema.All, predicates?: Filter.Props<unknown>): Query<any> {
    return new QueryClass({
      type: 'select',
      filter: FilterClass.type(schema, predicates).ast,
    });
  }

  // static text(schema: Schema.Schema.All, text: string, options?: Query.TextSearchOptions): Query<any> {
  //   const dxn = getSchemaDXN(schema) ?? raise(new TypeError('Schema has no DXN'));
  //   return new QueryClass({
  //     type: 'text-search',
  //     typename: dxn.toString(),
  //     text,
  //     searchKind: options?.type,
  //   });
  // }

  static all(...queries: Query<any>[]): Query<any> {
    return new QueryClass({
      type: 'union',
      queries: queries.map((q) => q.ast),
    });
  }

  constructor(public readonly ast: QueryAST.Query) {}

  '~Query' = QueryClass.variance;

  select(filter: Filter<any> | Filter.Props<any>): Query<any> {
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

  reference(key: string): Query<any> {
    return new QueryClass({
      type: 'reference-traversal',
      anchor: this.ast,
      property: key,
    });
  }

  referencedBy(target: Schema.Schema.All, key: string): Query<any> {
    const dxn = getSchemaDXN(target) ?? raise(new TypeError('Target schema has no DXN'));
    return new QueryClass({
      type: 'incoming-references',
      anchor: this.ast,
      property: key,
      typename: dxn.toString(),
    });
  }

  sourceOf(relation: Schema.Schema.All, predicates?: Filter.Props<unknown> | undefined): Query<any> {
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'outgoing',
      filter: FilterClass.type(relation, predicates).ast,
    });
  }

  targetOf(relation: Schema.Schema.All, predicates?: Filter.Props<unknown> | undefined): Query<any> {
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'incoming',
      filter: FilterClass.type(relation, predicates).ast,
    });
  }

  source(): Query<any> {
    return new QueryClass({
      type: 'relation-traversal',
      anchor: this.ast,
      direction: 'source',
    });
  }

  target(): Query<any> {
    return new QueryClass({
      type: 'relation-traversal',
      anchor: this.ast,
      direction: 'target',
    });
  }
}

export const Query: QueryAPI = QueryClass;
