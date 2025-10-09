//
// Copyright 2025 DXOS.org
//

import { Match, Schema } from 'effect';
import type { NonEmptyArray } from 'effect/Array';
import type { Simplify } from 'effect/Schema';

import { raise } from '@dxos/debug';
import { type ForeignKey, type QueryAST } from '@dxos/echo-protocol';
import { getTypeReference } from '@dxos/echo-schema';
import { assertArgument } from '@dxos/invariant';
import { DXN, ObjectId } from '@dxos/keys';

import type * as Obj from '../Obj';
import * as Ref from '../Ref';
import type * as Type from '../Type';

// TODO(dmaretskyi): Split up into interfaces for objects and relations so they can have separate verbs.
// TODO(dmaretskyi): Undirected relation traversals.
// TODO(wittjosiah): Make Filter & Query pipeable.

export const Tag = Schema.Struct({
  label: Schema.String,
  hue: Schema.optional(Schema.String),
});

export type Tag = Schema.Schema.Type<typeof Tag>;

export const sortTags = ({ label: a }: Tag, { label: b }: Tag) => a.localeCompare(b);

export interface Order<T> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Order': { value: T };

  ast: QueryAST.Order;
}

class OrderClass implements Order<any> {
  private static variance: Order<any>['~Order'] = {} as Order<any>['~Order'];

  static is(value: unknown): value is Order<any> {
    return typeof value === 'object' && value !== null && '~Order' in value;
  }

  constructor(public readonly ast: QueryAST.Order) {}

  '~Order' = OrderClass.variance;
}

export namespace Order {
  export const natural: Order<any> = new OrderClass({ kind: 'natural' });
  export const property = <T>(property: keyof T & string, direction: QueryAST.OrderDirection): Order<T> =>
    new OrderClass({
      kind: 'property',
      property,
      direction,
    });
}

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
  orderBy(...order: NonEmptyArray<Order<T>>): Query<T>;

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
    schema: S,
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

  export type TextSearchOptions = {
    // TODO(dmaretskyi): Hybrid search.
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

  /** Construct a filter from an ast. */
  fromAst(ast: QueryAST.Filter): Filter<any>;

  /**
   * Filter that matches all objects.
   */
  everything(): Filter<any>;

  /**
   * Filter that matches no objects.
   */
  nothing(): Filter<any>;

  /**
   * Filter by object IDs.
   */
  // TODO(dmaretskyi): Rename to `Filter.id`.
  ids(...id: ObjectId[]): Filter<any>;

  /**
   * Filter by type.
   */
  type<S extends Schema.Schema.All>(
    schema: S,
    props?: Filter.Props<Schema.Schema.Type<S>>,
  ): Filter<Schema.Schema.Type<S>>;

  /**
   * Filter by non-qualified typename.
   */
  typename(typename: string): Filter<any>;

  /**
   * Filter by fully qualified type DXN.
   */
  typeDXN(dxn: DXN): Filter<any>;

  /**
   * Filter by tag.
   */
  tag(tag: string): Filter<Obj.Any>;

  /**
   * Filter by properties.
   */
  props<T>(props: Filter.Props<T>): Filter<T>;

  /**
   * Full-text or vector search.
   */
  text(
    // TODO(dmaretskyi): Consider passing a vector here, but really the embedding should be done on the query-executor side.
    text: string,
    options?: Query.TextSearchOptions,
  ): Filter<any>;

  /**
   * Filter by foreign keys.
   */
  foreignKeys<S extends Schema.Schema.All>(schema: S, keys: ForeignKey[]): Filter<Schema.Schema.Type<S>>;

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
   * Predicate for an array property to contain the provided value.
   * @param value - Value to check against.
   */
  contains<T>(value: T): Filter<T[]>;

  /**
   * Predicate for property to be in the provided range.
   * @param from - Start of the range (inclusive).
   * @param to - End of the range (exclusive).
   */
  between<T>(from: T, to: T): Filter<T>;

  /**
   * Negate the filter.
   */
  not<F extends Filter.Any>(filter: F): Filter<Filter.Type<F>>;

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

  static fromAst(ast: QueryAST.Filter): Filter<any> {
    return new FilterClass(ast);
  }

  static everything(): FilterClass {
    return new FilterClass({
      type: 'object',
      typename: null,
      props: {},
    });
  }

  static nothing(): FilterClass {
    return new FilterClass({
      type: 'not',
      filter: {
        type: 'object',
        typename: null,
        props: {},
      },
    });
  }

  static relation() {
    return new FilterClass({
      type: 'object',
      typename: null,
      props: {},
    });
  }

  static ids(...ids: ObjectId[]): Filter<any> {
    assertArgument(
      ids.every((id) => ObjectId.isValid(id)),
      'ids',
      'ids must be valid',
    );

    if (ids.length === 0) {
      return Filter.nothing();
    }

    return new FilterClass({
      type: 'object',
      typename: null,
      id: ids,
      props: {},
    });
  }

  static type<S extends Schema.Schema.All>(
    schema: S,
    props?: Filter.Props<Schema.Schema.Type<S>>,
  ): Filter<Schema.Schema.Type<S>> {
    const dxn = getTypeReference(schema)?.toDXN() ?? raise(new TypeError('Schema has no DXN'));
    return new FilterClass({
      type: 'object',
      typename: dxn.toString(),
      ...propsFilterToAst(props ?? {}),
    });
  }

  static typename(typename: string): Filter<any> {
    assertArgument(!typename.startsWith('dxn:'), 'typename', 'Typename must no be qualified');
    return new FilterClass({
      type: 'object',
      typename: DXN.fromTypename(typename).toString(),
      props: {},
    });
  }

  static typeDXN(dxn: DXN): Filter<any> {
    return new FilterClass({
      type: 'object',
      typename: dxn.toString(),
      props: {},
    });
  }

  static tag(tag: string): Filter<any> {
    return new FilterClass({
      type: 'tag',
      tag,
    });
  }

  static props<T>(props: Filter.Props<T>): Filter<T> {
    return new FilterClass({
      type: 'object',
      typename: null,
      ...propsFilterToAst(props),
    });
  }

  static text(text: string, options?: Query.TextSearchOptions): Filter<any> {
    return new FilterClass({
      type: 'text-search',
      text,
      searchKind: options?.type,
    });
  }

  static foreignKeys<S extends Schema.Schema.All>(schema: S, keys: ForeignKey[]): Filter<Schema.Schema.Type<S>> {
    const dxn = getTypeReference(schema)?.toDXN() ?? raise(new TypeError('Schema has no DXN'));
    return new FilterClass({
      type: 'object',
      typename: dxn.toString(),
      props: {},
      foreignKeys: keys,
    });
  }

  static eq<T>(value: T): Filter<T> {
    if (!Ref.isRef(value) && typeof value === 'object' && value !== null) {
      throw new TypeError('Cannot use object as a value for eq filter');
    }

    return new FilterClass({
      type: 'compare',
      operator: 'eq',
      value: Ref.isRef(value) ? value.noInline().encode() : value,
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

  static contains<T>(value: T): Filter<T[]> {
    return new FilterClass({
      type: 'contains',
      value,
    });
  }

  static between<T>(from: T, to: T): Filter<T> {
    return new FilterClass({
      type: 'range',
      from,
      to,
    });
  }

  static not<F extends Filter.Any>(filter: F): Filter<Filter.Type<F>> {
    return new FilterClass({
      type: 'not',
      filter: filter.ast,
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
// TODO(dmaretskyi): Filter only properties that are references (or optional references, or unions that include references).
type RefPropKey<T> = keyof T & string;

const propsFilterToAst = (predicates: Filter.Props<any>): Pick<QueryAST.FilterObject, 'id' | 'props'> => {
  let idFilter: readonly ObjectId[] | undefined;
  if ('id' in predicates) {
    assertArgument(
      typeof predicates.id === 'string' || Array.isArray(predicates.id),
      'predicates.id',
      'invalid id filter',
    );
    idFilter = typeof predicates.id === 'string' ? [predicates.id] : predicates.id;
    Schema.Array(ObjectId).pipe(Schema.validateSync)(idFilter);
  }

  return {
    id: idFilter,
    props: Object.fromEntries(
      Object.entries(predicates)
        .filter(([prop, _value]) => prop !== 'id')
        .map(([prop, predicate]) => [prop, processPredicate(predicate)]),
    ) as Record<string, QueryAST.Filter>,
  };
};

const processPredicate = (predicate: any): QueryAST.Filter => {
  return Match.value(predicate).pipe(
    Match.withReturnType<QueryAST.Filter>(),
    Match.when(Filter.is, (predicate) => predicate.ast),
    // TODO(wittjosiah): Add support for array predicates.
    Match.when(Array.isArray, (_predicate) => {
      throw new Error('Array predicates are not yet supported.');
    }),
    Match.when(
      (predicate: any) => !Ref.isRef(predicate) && typeof predicate === 'object' && predicate !== null,
      (predicate) => {
        const nestedProps = Object.fromEntries(
          Object.entries(predicate).map(([key, value]) => [key, processPredicate(value)]),
        );

        return {
          type: 'object',
          typename: null,
          props: nestedProps,
        };
      },
    ),
    Match.orElse((value) => Filter.eq(value).ast),
  );
};

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

  static type(schema: Schema.Schema.All, predicates?: Filter.Props<unknown>): Query<any> {
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
    const dxn = getTypeReference(target)?.toDXN() ?? raise(new TypeError('Target schema has no DXN'));
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

  orderBy(...order: Order<any>[]): Query<any> {
    return new QueryClass({
      type: 'order',
      query: this.ast,
      order: order.map((o) => o.ast),
    });
  }

  options(options: QueryAST.QueryOptions): Query<any> {
    return new QueryClass({
      type: 'options',
      query: this.ast,
      options,
    });
  }
}

export const Query: QueryAPI = QueryClass;
