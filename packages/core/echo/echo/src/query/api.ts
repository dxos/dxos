//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';

import { raise } from '@dxos/debug';
import { getSchemaDXN, type Ref } from '@dxos/echo-schema';

import type * as QueryAST from './ast';
import type { Relation } from '..';

// TODO(dmaretskyi): Split up into interfaces for objects and relations so they can have separate verbs.
// TODO(dmaretskyi): Undirected relation traversals.

export interface Query<T> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Query': { value: T };

  ast: QueryAST.AST;

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
    predicates?: PredicateSet<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;

  /**
   * Find relations where this object is the target.
   * @returns Query for the relation objects.
   * @param relation - Schema of the relation.
   * @param predicates - Predicates to filter the relation objects.
   */
  targetOf<S extends Schema.Schema.All>(
    relation: S,
    predicates?: PredicateSet<Schema.Schema.Type<S>>,
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
   * Query for objects of a given schema.
   * @param schema - Schema of the objects.
   * @param predicates - Predicates to filter the objects.
   * @returns Query for the objects.
   */
  type<S extends Schema.Schema.All>(
    schema: S,
    predicates?: PredicateSet<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;

  /**
   * Full-text or vector search.
   */
  text<S extends Schema.Schema.All>(
    // TODO(dmaretskyi): Allow passing an array of schema here.
    schema: S,
    // TODO(dmaretskyi): Consider passing a vector here, but really the embedding should be done on the query-executor side.
    text: string,
    options?: Query.TextSearchOptions,
  ): Query<Schema.Schema.Type<S>>;

  /**
   * Combine results of multiple queries.
   * @param queries - Queries to combine.
   * @returns Query for the combined results.
   */
  all<T>(...queries: Query<T>[]): Query<T>;

  /**
   * Predicate for property to be greater than the provided value.
   */
  gt<T>(value: T): Predicate<T>;

  /**
   * Predicate for property to be greater than or equal to the provided value.
   */
  gte<T>(value: T): Predicate<T>;

  /**
   * Predicate for property to be less than the provided value.
   */
  lt<T>(value: T): Predicate<T>;

  /**
   * Predicate for property to be less than or equal to the provided value.
   */
  lte<T>(value: T): Predicate<T>;

  /**
   * Predicate for property to be in the provided array.
   * @param values - Values to check against.
   */
  in<T>(...values: T[]): Predicate<T>;

  /**
   * Predicate for property to be in the provided range.
   * @param from - Start of the range (inclusive).
   * @param to - End of the range (exclusive).
   */
  range<T>(from: T, to: T): Predicate<T>;

  // TODO(dmaretskyi): Add `Query.match` to support pattern matching on string props.
}

export declare namespace Query {
  export type TextSearchOptions = {
    type?: 'full-text' | 'vector';
  };
}

export interface Predicate<T> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Predicate': { value: T };

  ast: QueryAST.Predicate;
}

const Predicate = {
  variance: {} as Predicate<any>['~Predicate'],

  make: <T>(ast: QueryAST.Predicate): Predicate<T> => ({ ast, '~Predicate': Predicate.variance }) as Predicate<T>,
};

type PredicateSet<T> = {
  // Predicate or a value as a shorthand for `eq`.
  [K in keyof T & string]?: Predicate<T[K]> | T[K];
};

/**
 * All property paths inside T that are references.
 */
type RefPropKey<T> = { [K in keyof T]: T[K] extends Ref<infer _U> ? K : never }[keyof T] & string;

const predicateSetToAst = (predicates: PredicateSet<any>): QueryAST.PredicateSet => {
  return Object.fromEntries(
    Object.entries(predicates).map(([key, predicate]) => [key, predicate.ast]),
  ) as QueryAST.PredicateSet;
};

class QueryClass implements Query<any> {
  private static variance: Query<any>['~Query'] = {} as Query<any>['~Query'];

  static type(schema: Schema.Schema.All, predicates?: PredicateSet<unknown>): Query<any> {
    const dxn = getSchemaDXN(schema) ?? raise(new TypeError('Schema has no DXN'));
    return new QueryClass({
      type: 'type',
      typename: dxn.toString(),
      predicates: predicates ? predicateSetToAst(predicates) : undefined,
    });
  }

  static text(schema: Schema.Schema.All, text: string, options?: Query.TextSearchOptions): Query<any> {
    const dxn = getSchemaDXN(schema) ?? raise(new TypeError('Schema has no DXN'));
    return new QueryClass({
      type: 'text-search',
      typename: dxn.toString(),
      text,
      searchKind: options?.type,
    });
  }

  static all(...queries: Query<any>[]): Query<any> {
    return new QueryClass({
      type: 'union',
      queries: queries.map((q) => q.ast),
    });
  }

  static gt(value: unknown): Predicate<any> {
    return Predicate.make({ type: 'gt', value });
  }

  static gte(value: unknown): Predicate<any> {
    return Predicate.make({ type: 'gte', value });
  }

  static lt(value: unknown): Predicate<any> {
    return Predicate.make({ type: 'lt', value });
  }

  static lte(value: unknown): Predicate<any> {
    return Predicate.make({ type: 'lte', value });
  }

  static in(...values: unknown[]): Predicate<any> {
    return Predicate.make({ type: 'in', values });
  }

  static range(from: unknown, to: unknown): Predicate<any> {
    return Predicate.make({ type: 'range', from, to });
  }

  constructor(public readonly ast: QueryAST.AST) {}

  '~Query' = QueryClass.variance;

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

  sourceOf(relation: Schema.Schema.All, predicates?: PredicateSet<unknown> | undefined): Query<any> {
    const dxn = getSchemaDXN(relation) ?? raise(new TypeError('Relation schema has no DXN'));
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'outgoing',
      typename: dxn.toString(),
      predicates: predicates ? predicateSetToAst(predicates) : undefined,
    });
  }

  targetOf(relation: Schema.Schema.All, predicates?: PredicateSet<unknown> | undefined): Query<any> {
    const dxn = getSchemaDXN(relation) ?? raise(new TypeError('Relation schema has no DXN'));
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'incoming',
      typename: dxn.toString(),
      predicates: predicates ? predicateSetToAst(predicates) : undefined,
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
