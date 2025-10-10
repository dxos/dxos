//
// Copyright 2025 DXOS.org
//

import type { Schema } from 'effect';

import type { Filter, Order, Query, Ref } from '@dxos/echo';
import type * as Echo from '@dxos/echo';
import type { ForeignKey, QueryAST } from '@dxos/echo-protocol';
import { assertArgument } from '@dxos/invariant';
import type { DXN, ObjectId } from '@dxos/keys';

class OrderClass implements Echo.Order<any> {
  private static variance: Echo.Order<any>['~Order'] = {} as Echo.Order<any>['~Order'];

  static is(value: unknown): value is Echo.Order<any> {
    return typeof value === 'object' && value !== null && '~Order' in value;
  }

  constructor(public readonly ast: QueryAST.Order) {}

  '~Order' = OrderClass.variance;
}
namespace Order1 {
  export const natural: Echo.Order<any> = new OrderClass({ kind: 'natural' });
  export const property = <T>(property: keyof T & string, direction: QueryAST.OrderDirection): Echo.Order<T> =>
    new OrderClass({
      kind: 'property',
      property,
      direction,
    });
}

const Order2: typeof Echo.Order = Order1;
export { Order2 as Order };

class FilterClass implements Echo.Filter<any> {
  private static variance: Echo.Filter<any>['~Filter'] = {} as Echo.Filter<any>['~Filter'];

  static is(value: unknown): value is Echo.Filter<any> {
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

  static ids(...ids: ObjectId[]): Echo.Filter<any> {
    // assertArgument(
    //   ids.every((id) => ObjectId.isValid(id)),
    //   'ids',
    //   'ids must be valid',
    // );

    if (ids.length === 0) {
      return FilterClass.nothing();
    }

    return new FilterClass({
      type: 'object',
      typename: null,
      id: ids,
      props: {},
    });
  }

  static type<S extends Schema.Schema.All>(
    schema: S | string,
    props?: Echo.Filter.Props<Schema.Schema.Type<S>>,
  ): Echo.Filter<Schema.Schema.Type<S>> {
    if (typeof schema !== 'string') {
      throw new TypeError('expected typename as the first paramter');
    }
    return new FilterClass({
      type: 'object',
      typename: makeTypeDxn(schema),
      ...propsFilterToAst(props ?? {}),
    });
  }

  static typename(typename: string): Echo.Filter<any> {
    return new FilterClass({
      type: 'object',
      typename: makeTypeDxn(typename),
      props: {},
    });
  }

  static typeDXN(dxn: DXN): Echo.Filter<any> {
    return new FilterClass({
      type: 'object',
      typename: dxn.toString(),
      props: {},
    });
  }

  static tag(tag: string): Echo.Filter<any> {
    return new FilterClass({
      type: 'tag',
      tag,
    });
  }

  static props<T>(props: Echo.Filter.Props<T>): Echo.Filter<T> {
    return new FilterClass({
      type: 'object',
      typename: null,
      ...propsFilterToAst(props),
    });
  }

  static text(text: string, options?: Echo.Query.TextSearchOptions): Echo.Filter<any> {
    return new FilterClass({
      type: 'text-search',
      text,
      searchKind: options?.type,
    });
  }

  static foreignKeys<S extends Schema.Schema.All>(
    schema: S | string,
    keys: ForeignKey[],
  ): Echo.Filter<Schema.Schema.Type<S>> {
    assertArgument(typeof schema === 'string', 'schema');
    assertArgument(!schema.startsWith('dxn:'), 'schema');
    return new FilterClass({
      type: 'object',
      typename: `dxn:type:${schema}`,
      props: {},
      foreignKeys: keys,
    });
  }

  static eq<T>(value: T): Echo.Filter<T> {
    if (!isRef(value) && typeof value === 'object' && value !== null) {
      throw new TypeError('Cannot use object as a value for eq filter');
    }

    return new FilterClass({
      type: 'compare',
      operator: 'eq',
      value: isRef(value) ? value.noInline().encode() : value,
    });
  }

  static neq<T>(value: T): Echo.Filter<T> {
    return new FilterClass({
      type: 'compare',
      operator: 'neq',
      value,
    });
  }

  static gt<T>(value: T): Echo.Filter<T> {
    return new FilterClass({
      type: 'compare',
      operator: 'gt',
      value,
    });
  }

  static gte<T>(value: T): Echo.Filter<T> {
    return new FilterClass({
      type: 'compare',
      operator: 'gte',
      value,
    });
  }

  static lt<T>(value: T): Echo.Filter<T> {
    return new FilterClass({
      type: 'compare',
      operator: 'lt',
      value,
    });
  }

  static lte<T>(value: T): Echo.Filter<T> {
    return new FilterClass({
      type: 'compare',
      operator: 'lte',
      value,
    });
  }

  static in<T>(...values: T[]): Echo.Filter<T> {
    return new FilterClass({
      type: 'in',
      values,
    });
  }

  static contains<T>(value: T): Echo.Filter<T[]> {
    return new FilterClass({
      type: 'contains',
      value,
    });
  }

  static between<T>(from: T, to: T): Echo.Filter<T> {
    return new FilterClass({
      type: 'range',
      from,
      to,
    });
  }

  static not<F extends Echo.Filter.Any>(filter: F): Echo.Filter<Echo.Filter.Type<F>> {
    return new FilterClass({
      type: 'not',
      filter: filter.ast,
    });
  }

  static and<T>(...filters: Echo.Filter<T>[]): Echo.Filter<T> {
    return new FilterClass({
      type: 'and',
      filters: filters.map((f) => f.ast),
    });
  }

  static or<T>(...filters: Echo.Filter<T>[]): Echo.Filter<T> {
    return new FilterClass({
      type: 'or',
      filters: filters.map((f) => f.ast),
    });
  }

  private constructor(public readonly ast: QueryAST.Filter) {}

  '~Filter' = FilterClass.variance;
}

export const Filter1: typeof Echo.Filter = FilterClass;
export { Filter1 as Filter };

/**
 * All property paths inside T that are references.
 */
// TODO(dmaretskyi): Filter only properties that are references (or optional references, or unions that include references).
type RefPropKey<T> = keyof T & string;

const propsFilterToAst = (predicates: Echo.Filter.Props<any>): Pick<QueryAST.FilterObject, 'id' | 'props'> => {
  let idFilter: readonly ObjectId[] | undefined;
  if ('id' in predicates) {
    assertArgument(
      typeof predicates.id === 'string' || Array.isArray(predicates.id),
      'predicates.id',
      'invalid id filter',
    );
    idFilter = typeof predicates.id === 'string' ? [predicates.id] : predicates.id;
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
  if (FilterClass.is(predicate)) {
    return predicate.ast;
  }

  if (Array.isArray(predicate)) {
    throw new Error('Array predicates are not yet supported.');
  }

  if (!isRef(predicate) && typeof predicate === 'object' && predicate !== null) {
    const nestedProps = Object.fromEntries(
      Object.entries(predicate).map(([key, value]) => [key, processPredicate(value)]),
    );

    return {
      type: 'object',
      typename: null,
      props: nestedProps,
    };
  }

  return FilterClass.eq(predicate).ast;
};

class QueryClass implements Echo.Query<any> {
  private static variance: Echo.Query<any>['~Query'] = {} as Echo.Query<any>['~Query'];

  static is(value: unknown): value is Echo.Query<any> {
    return typeof value === 'object' && value !== null && '~Query' in value;
  }

  static fromAst(ast: QueryAST.Query): Echo.Query<any> {
    return new QueryClass(ast);
  }

  static select<F extends Echo.Filter.Any>(filter: F): Echo.Query<Echo.Filter.Type<F>> {
    return new QueryClass({
      type: 'select',
      filter: filter.ast,
    });
  }

  static type(schema: Schema.Schema.All | string, predicates?: Echo.Filter.Props<unknown>): Query<any> {
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
    if (FilterClass.is(filter)) {
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

  referencedBy(target: Schema.Schema.All | string, key: string): Query<any> {
    assertArgument(typeof target === 'string', 'target');
    assertArgument(!target.startsWith('dxn:'), 'target');
    return new QueryClass({
      type: 'incoming-references',
      anchor: this.ast,
      property: key,
      typename: target,
    });
  }

  sourceOf(relation: Schema.Schema.All | string, predicates?: Filter.Props<unknown> | undefined): Query<any> {
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'outgoing',
      filter: FilterClass.type(relation, predicates).ast,
    });
  }

  targetOf(relation: Schema.Schema.All | string, predicates?: Filter.Props<unknown> | undefined): Query<any> {
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

export const Query1: typeof Echo.Query = QueryClass;
export { Query1 as Query };

const RefTypeId: unique symbol = Symbol('@dxos/echo-schema/Ref');
const isRef = (obj: any): obj is Ref.Ref<any> => {
  return obj && typeof obj === 'object' && RefTypeId in obj;
};

const makeTypeDxn = (typename: string) => {
  assertArgument(typeof typename === 'string', 'typename');
  assertArgument(!typename.startsWith('dxn:'), 'typename');
  return `dxn:type:${typename}`;
};
