import { raise } from '@dxos/debug';
import { getSchemaDXN, type Ref } from '@dxos/echo-schema';
import { Schema } from 'effect';
import * as QueryAST from './ast';

// TODO(dmaretskyi): Split up into interfaces for objects and relations so they can have separate verbs.
// TODO(dmaretskyi): Undirected relation traversals.
export interface Query<T> {
  '~Query': { value: T };

  ast: QueryAST.AST;

  /**
   * Traverse an outgoing reference.
   * @param key - Property path inside T that is a reference.
   * @returns Query for the target of the reference.
   */
  references<K extends RefPropKey<T>>(key: K): Query<Ref.Target<T[K]>>;

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
   * Relations outgoing from the object.
   * @returns Query for the relation objects.
   * @param relation - Schema of the relation.
   * @param predicates - Predicates to filter the relation objects.
   */
  outgoingRelations<S extends Schema.Schema.All>(
    relation: S,
    predicates?: PredicateSet<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;

  /**
   * Relations incoming to the object.
   * @returns Query for the relation objects.
   * @param relation - Schema of the relation.
   * @param predicates - Predicates to filter the relation objects.
   */
  incomingRelations<S extends Schema.Schema.All>(
    relation: S,
    predicates?: PredicateSet<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;

  /**
   * For a query for relations, get the source objects.
   * @returns Query for the source objects.
   */
  sources<S extends Schema.Schema.All>(): Query<Schema.Schema.Type<S>>;

  /**
   * For a query for relations, get the target objects.
   * @returns Query for the target objects.
   */
  targets<S extends Schema.Schema.All>(): Query<Schema.Schema.Type<S>>;
}

interface QueryAPI {
  type<S extends Schema.Schema.All>(
    schema: S,
    predicates?: PredicateSet<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;

  all<T>(...queries: Query<T>[]): Query<T>;

  gt<T>(value: T): Predicate<T>;
  gte<T>(value: T): Predicate<T>;
  lt<T>(value: T): Predicate<T>;
  lte<T>(value: T): Predicate<T>;
  in<T>(...values: T[]): Predicate<T>;
  range<T>(from: T, to: T): Predicate<T>;
}

export interface Predicate<T> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Predicate': { value: T };

  ast: QueryAST.Predicate;
}

export const Predicate = {
  variance: {} as Predicate<any>['~Predicate'],

  make<T>(ast: QueryAST.Predicate): Predicate<T> {
    return { ast, '~Predicate': Predicate.variance } as Predicate<T>;
  },
};

type PredicateSet<T> = {
  // Predicate or a value as a shorthand for `eq`.
  [K in keyof T & string]?: Predicate<T[K]> | T[K];
};

/**
 * All property paths inside T that are references.
 */
type RefPropKey<T> = { [K in keyof T]: T[K] extends Ref<infer U> ? K : never }[keyof T] & string;

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

  references(key: string): Query<any> {
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

  outgoingRelations(relation: Schema.Schema.All, predicates?: PredicateSet<unknown> | undefined): Query<any> {
    const dxn = getSchemaDXN(relation) ?? raise(new TypeError('Relation schema has no DXN'));
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'outgoing',
      typename: dxn.toString(),
      predicates: predicates ? predicateSetToAst(predicates) : undefined,
    });
  }

  incomingRelations(relation: Schema.Schema.All, predicates?: PredicateSet<unknown> | undefined): Query<any> {
    const dxn = getSchemaDXN(relation) ?? raise(new TypeError('Relation schema has no DXN'));
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'incoming',
      typename: dxn.toString(),
      predicates: predicates ? predicateSetToAst(predicates) : undefined,
    });
  }

  sources(): Query<any> {
    return new QueryClass({
      type: 'relation-traversal',
      anchor: this.ast,
      direction: 'source',
    });
  }

  targets(): Query<any> {
    return new QueryClass({
      type: 'relation-traversal',
      anchor: this.ast,
      direction: 'target',
    });
  }
}

export const Query: QueryAPI = QueryClass;
