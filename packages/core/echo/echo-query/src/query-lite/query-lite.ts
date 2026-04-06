//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import type { Filter as Filter$, Order as Order$, Query as Query$, Ref } from '@dxos/echo';
import type { ForeignKey, QueryAST } from '@dxos/echo-protocol';
import { assertArgument } from '@dxos/invariant';
import type { DXN, ObjectId } from '@dxos/keys';

//
// Light-weight implementation of query execution.
//

// TODO(wittjosiah): The `export * as ...` syntax causes tsdown to genereate multiple files which breaks the sandbox.

class OrderClass implements Order$.Any {
  private static 'variance': Order$.Any['~Order'] = {} as Order$.Any['~Order'];

  static is(value: unknown): value is Order$.Any {
    return typeof value === 'object' && value !== null && '~Order' in value;
  }

  constructor(public readonly ast: QueryAST.Order) {}

  '~Order' = OrderClass.variance;
}

namespace Order1 {
  export const natural: Order$.Any = new OrderClass({ kind: 'natural' });
  export const property = <T>(property: keyof T & string, direction: QueryAST.OrderDirection): Order$.Order<T> =>
    new OrderClass({
      kind: 'property',
      property,
      direction,
    });
  export const rank = <T>(direction: QueryAST.OrderDirection = 'desc'): Order$.Order<T> =>
    new OrderClass({
      kind: 'rank',
      direction,
    });
}

const Order2: typeof Order$ = Order1;
export { Order2 as Order };

class FilterClass implements Filter$.Any {
  private static 'variance': Filter$.Any['~Filter'] = {} as Filter$.Any['~Filter'];

  static is(value: unknown): value is Filter$.Any {
    return typeof value === 'object' && value !== null && '~Filter' in value;
  }

  static fromAst(ast: QueryAST.Filter): Filter$.Any {
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

  static id(...ids: ObjectId[]): Filter$.Any {
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
    props?: Filter$.Props<Schema.Schema.Type<S>>,
  ): Filter$.Filter<Schema.Schema.Type<S>> {
    if (typeof schema !== 'string') {
      throw new TypeError('expected typename as the first paramter');
    }
    return new FilterClass({
      type: 'object',
      typename: makeTypeDxn(schema),
      ...propsFilterToAst(props ?? {}),
    });
  }

  static typename(typename: string): Filter$.Any {
    return new FilterClass({
      type: 'object',
      typename: makeTypeDxn(typename),
      props: {},
    });
  }

  static typeDXN(dxn: DXN): Filter$.Any {
    return new FilterClass({
      type: 'object',
      typename: dxn.toString(),
      props: {},
    });
  }

  static tag(tag: string): Filter$.Any {
    return new FilterClass({
      type: 'tag',
      tag,
    });
  }

  static props<T>(props: Filter$.Props<T>): Filter$.Filter<T> {
    return new FilterClass({
      type: 'object',
      typename: null,
      ...propsFilterToAst(props),
    });
  }

  static text(text: string, options?: Filter$.TextSearchOptions): Filter$.Any {
    return new FilterClass({
      type: 'text-search',
      text,
      searchKind: options?.type,
    });
  }

  static foreignKeys<S extends Schema.Schema.All>(
    schema: S | string,
    keys: ForeignKey[],
  ): Filter$.Filter<Schema.Schema.Type<S>> {
    assertArgument(typeof schema === 'string', 'schema');
    assertArgument(!schema.startsWith('dxn:'), 'schema');
    return new FilterClass({
      type: 'object',
      typename: `dxn:type:${schema}`,
      props: {},
      foreignKeys: keys,
    });
  }

  static eq<T>(value: T): Filter$.Filter<T | undefined> {
    if (!isRef(value) && typeof value === 'object' && value !== null) {
      throw new TypeError('Cannot use object as a value for eq filter');
    }

    return new FilterClass({
      type: 'compare',
      operator: 'eq',
      value: isRef(value) ? value.noInline().encode() : value,
    });
  }

  static neq<T>(value: T): Filter$.Filter<T | undefined> {
    return new FilterClass({
      type: 'compare',
      operator: 'neq',
      value,
    });
  }

  static gt<T>(value: T): Filter$.Filter<T | undefined> {
    return new FilterClass({
      type: 'compare',
      operator: 'gt',
      value,
    });
  }

  static gte<T>(value: T): Filter$.Filter<T | undefined> {
    return new FilterClass({
      type: 'compare',
      operator: 'gte',
      value,
    });
  }

  static lt<T>(value: T): Filter$.Filter<T | undefined> {
    return new FilterClass({
      type: 'compare',
      operator: 'lt',
      value,
    });
  }

  static lte<T>(value: T): Filter$.Filter<T | undefined> {
    return new FilterClass({
      type: 'compare',
      operator: 'lte',
      value,
    });
  }

  static in<T>(...values: T[]): Filter$.Filter<T | undefined> {
    return new FilterClass({
      type: 'in',
      values,
    });
  }

  static contains<T>(value: T): Filter$.Filter<readonly T[] | undefined> {
    return new FilterClass({
      type: 'contains',
      value,
    });
  }

  static between<T>(from: T, to: T): Filter$.Filter<unknown> {
    return new FilterClass({
      type: 'range',
      from,
      to,
    });
  }

  static updated(range: { after?: Date | number; before?: Date | number }): Filter$.Any {
    return FilterClass.#timeRangeFilter('updatedAt', range);
  }

  static created(range: { after?: Date | number; before?: Date | number }): Filter$.Any {
    return FilterClass.#timeRangeFilter('createdAt', range);
  }

  static #timeRangeFilter(
    field: 'updatedAt' | 'createdAt',
    range: { after?: Date | number; before?: Date | number },
  ): Filter$.Any {
    const toMs = (d: Date | number) => (typeof d === 'number' ? d : d.getTime());
    const filters: Filter$.Any[] = [];
    if (range.after != null) {
      filters.push(new FilterClass({ type: 'timestamp', field, operator: 'gte', value: toMs(range.after) }));
    }
    if (range.before != null) {
      filters.push(new FilterClass({ type: 'timestamp', field, operator: 'lte', value: toMs(range.before) }));
    }
    if (filters.length === 0) {
      return FilterClass.everything();
    }
    return filters.length === 1 ? filters[0] : FilterClass.and(...filters);
  }

  static not<F extends Filter$.Any>(filter: F): Filter$.Filter<Filter$.Type<F>> {
    return new FilterClass({
      type: 'not',
      filter: filter.ast,
    });
  }

  static and<Filters extends readonly Filter$.Any[]>(
    ...filters: Filters
  ): Filter$.Filter<Filter$.Type<Filters[number]>> {
    return new FilterClass({
      type: 'and',
      filters: filters.map((f) => f.ast),
    });
  }

  static or<Filters extends readonly Filter$.Any[]>(
    ...filters: Filters
  ): Filter$.Filter<Filter$.Type<Filters[number]>> {
    return new FilterClass({
      type: 'or',
      filters: filters.map((f) => f.ast),
    });
  }

  /** Returns a human-readable string representation of a Filter AST. */
  static pretty(filter: Filter$.Any): string {
    return prettyFilter(filter.ast);
  }

  private constructor(public readonly ast: QueryAST.Filter) {}

  '~Filter' = FilterClass.variance;
}

export const Filter1: typeof Filter$ = FilterClass;
export { Filter1 as Filter };

/**
 * All property paths inside T that are references.
 */
// TODO(dmaretskyi): Filter only properties that are references (or optional references, or unions that include references).
type RefPropKey<T> = keyof T & string;

const propsFilterToAst = (predicates: Filter$.Props<any>): Pick<QueryAST.FilterObject, 'id' | 'props'> => {
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

class QueryClass implements Query$.Any {
  private static 'variance': Query$.Any['~Query'] = {} as Query$.Any['~Query'];

  static is(value: unknown): value is Query$.Any {
    return typeof value === 'object' && value !== null && '~Query' in value;
  }

  static fromAst(ast: QueryAST.Query): Query$.Any {
    return new QueryClass(ast);
  }

  static select<F extends Filter$.Any>(filter: F): Query$.Query<Filter$.Type<F>> {
    return new QueryClass({
      type: 'select',
      filter: filter.ast,
    });
  }

  select(filter: Filter$.Any | Filter$.Props<any>): Query$.Any {
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

  static type(schema: Schema.Schema.All | string, predicates?: Filter$.Props<unknown>): Query$.Any {
    return new QueryClass({
      type: 'select',
      filter: FilterClass.type(schema, predicates).ast,
    });
  }

  static all(...queries: Query$.Any[]): Query$.Any {
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

  static without<T>(source: Query$.Query<T>, exclude: Query$.Query<T>): Query$.Query<T> {
    return new QueryClass({
      type: 'set-difference',
      source: source.ast,
      exclude: exclude.ast,
    });
  }

  static from(source: any, options?: { includeFeeds?: boolean }): Query$.Any {
    const baseQuery: QueryAST.Query = {
      type: 'select',
      filter: FilterClass.everything().ast,
    };
    const wrapper = new QueryClass(baseQuery);
    return wrapper.from(source, options);
  }

  from(arg: any, options?: { includeFeeds?: boolean }): Query$.Any {
    if (arg === 'all-accessible-spaces') {
      return new QueryClass({
        type: 'from',
        query: this.ast,
        from: {
          _tag: 'scope',
          scope: {
            ...(options?.includeFeeds ? { allQueuesFromSpaces: true } : {}),
          },
        },
      });
    }

    if (_isScopeLike(arg)) {
      return new QueryClass({
        type: 'from',
        query: this.ast,
        from: { _tag: 'scope', scope: arg },
      });
    }

    throw new TypeError('Database and Feed objects are not supported in query-lite sandbox');
  }

  /** Returns a human-readable string representation of a Query AST. */
  static pretty(query: Query$.Any): string {
    return prettyQuery(query.ast);
  }

  constructor(public readonly ast: QueryAST.Query) {}

  '~Query' = QueryClass.variance;

  reference(key: string): Query$.Any {
    return new QueryClass({
      type: 'reference-traversal',
      anchor: this.ast,
      property: key,
    });
  }

  referencedBy(target?: Schema.Schema.All | string, key?: string): Query$.Any {
    const typename =
      target !== undefined
        ? (assertArgument(typeof target === 'string', 'target'),
          assertArgument(!target.startsWith('dxn:'), 'target'),
          target)
        : null;
    return new QueryClass({
      type: 'incoming-references',
      anchor: this.ast,
      property: key ?? null,
      typename,
    });
  }

  sourceOf(relation?: Schema.Schema.All | string, predicates?: Filter$.Props<unknown> | undefined): Query$.Any {
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'outgoing',
      filter: relation !== undefined ? FilterClass.type(relation, predicates).ast : undefined,
    });
  }

  targetOf(relation?: Schema.Schema.All | string, predicates?: Filter$.Props<unknown> | undefined): Query$.Any {
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'incoming',
      filter: relation !== undefined ? FilterClass.type(relation, predicates).ast : undefined,
    });
  }

  source(): Query$.Any {
    return new QueryClass({
      type: 'relation-traversal',
      anchor: this.ast,
      direction: 'source',
    });
  }

  target(): Query$.Any {
    return new QueryClass({
      type: 'relation-traversal',
      anchor: this.ast,
      direction: 'target',
    });
  }

  parent(): Query$.Any {
    return new QueryClass({
      type: 'hierarchy-traversal',
      anchor: this.ast,
      direction: 'to-parent',
    });
  }

  children(): Query$.Any {
    return new QueryClass({
      type: 'hierarchy-traversal',
      anchor: this.ast,
      direction: 'to-children',
    });
  }

  orderBy(...order: Order$.Any[]): Query$.Any {
    return new QueryClass({
      type: 'order',
      query: this.ast,
      order: order.map((o) => o.ast),
    });
  }

  limit(limit: number): Query$.Any {
    return new QueryClass({
      type: 'limit',
      query: this.ast,
      limit,
    });
  }

  options(options: QueryAST.QueryOptions): Query$.Any {
    return new QueryClass({
      type: 'options',
      query: this.ast,
      options,
    });
  }
}

export const Query1: typeof Query$ = QueryClass;
export { Query1 as Query };

const RefTypeId: unique symbol = Symbol('@dxos/echo-query/Ref');
const isRef = (obj: any): obj is Ref.Ref<any> => {
  return obj && typeof obj === 'object' && RefTypeId in obj;
};

const makeTypeDxn = (typename: string) => {
  assertArgument(typeof typename === 'string', 'typename');
  assertArgument(!typename.startsWith('dxn:'), 'typename');
  return `dxn:type:${typename}`;
};

const SCOPE_KEYS = new Set(['spaceIds', 'queues', 'allQueuesFromSpaces']);

const _isScopeLike = (value: unknown): value is QueryAST.Scope => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.keys(value).every((key) => SCOPE_KEYS.has(key));
};

const prettyFilter = (filter: QueryAST.Filter): string => {
  switch (filter.type) {
    case 'object': {
      const parts: string[] = [];
      if (filter.typename !== null) {
        parts.push(JSON.stringify(filter.typename));
      }
      const propEntries = Object.entries(filter.props);
      if (propEntries.length > 0) {
        const propsStr = propEntries.map(([k, v]) => `${k}: ${prettyFilter(v)}`).join(', ');
        parts.push(`{ ${propsStr} }`);
      }
      if (filter.id !== undefined) {
        parts.push(`id: [${filter.id.join(', ')}]`);
      }
      return parts.length > 0 ? `Filter.type(${parts.join(', ')})` : 'Filter.everything()';
    }
    case 'compare':
      return `Filter.${filter.operator}(${JSON.stringify(filter.value)})`;
    case 'in':
      return `Filter.in(${filter.values.map((v) => JSON.stringify(v)).join(', ')})`;
    case 'contains':
      return `Filter.contains(${JSON.stringify(filter.value)})`;
    case 'range':
      return `Filter.between(${JSON.stringify(filter.from)}, ${JSON.stringify(filter.to)})`;
    case 'text-search':
      return `Filter.text(${JSON.stringify(filter.text)})`;
    case 'tag':
      return `Filter.tag(${JSON.stringify(filter.tag)})`;
    case 'timestamp':
      return `Filter.${filter.field}.${filter.operator}(${filter.value})`;
    case 'not':
      return `Filter.not(${prettyFilter(filter.filter)})`;
    case 'and':
      return `Filter.and(${filter.filters.map(prettyFilter).join(', ')})`;
    case 'or':
      return `Filter.or(${filter.filters.map(prettyFilter).join(', ')})`;
  }
};

const prettyQuery = (query: QueryAST.Query): string => {
  switch (query.type) {
    case 'select':
      return `Query.select(${prettyFilter(query.filter)})`;
    case 'filter':
      return `${prettyQuery(query.selection)}.select(${prettyFilter(query.filter)})`;
    case 'reference-traversal':
      return `${prettyQuery(query.anchor)}.reference(${JSON.stringify(query.property)})`;
    case 'incoming-references': {
      const args: string[] = [];
      if (query.typename !== null) {
        args.push(JSON.stringify(query.typename));
      }
      if (query.property !== null) {
        args.push(JSON.stringify(query.property));
      }
      return `${prettyQuery(query.anchor)}.referencedBy(${args.join(', ')})`;
    }
    case 'relation': {
      const method =
        query.direction === 'outgoing' ? 'sourceOf' : query.direction === 'incoming' ? 'targetOf' : 'relationOf';
      const filterStr = query.filter !== undefined ? prettyFilter(query.filter) : '';
      return `${prettyQuery(query.anchor)}.${method}(${filterStr})`;
    }
    case 'relation-traversal':
      return `${prettyQuery(query.anchor)}.${query.direction}()`;
    case 'hierarchy-traversal':
      return query.direction === 'to-parent'
        ? `${prettyQuery(query.anchor)}.parent()`
        : `${prettyQuery(query.anchor)}.children()`;
    case 'union':
      return `Query.all(${query.queries.map(prettyQuery).join(', ')})`;
    case 'set-difference':
      return `Query.without(${prettyQuery(query.source)}, ${prettyQuery(query.exclude)})`;
    case 'order': {
      const orders = query.order.map((o) => {
        if (o.kind === 'natural') {
          return 'Order.natural';
        }
        if (o.kind === 'rank') {
          return `Order.rank(${JSON.stringify(o.direction)})`;
        }
        return `Order.property(${JSON.stringify(o.property)}, ${JSON.stringify(o.direction)})`;
      });
      return `${prettyQuery(query.query)}.orderBy(${orders.join(', ')})`;
    }
    case 'options': {
      const parts: string[] = [];
      if (query.options.deleted !== undefined) {
        parts.push(`deleted: ${JSON.stringify(query.options.deleted)}`);
      }
      return `${prettyQuery(query.query)}.options({ ${parts.join(', ')} })`;
    }
    case 'from': {
      if (query.from._tag === 'scope') {
        const scope = query.from.scope;
        const parts: string[] = [];
        if (scope.spaceIds !== undefined) {
          parts.push(`spaceIds: [${scope.spaceIds.join(', ')}]`);
        }
        if (scope.queues !== undefined) {
          parts.push(`queues: [${scope.queues.join(', ')}]`);
        }
        if (scope.allQueuesFromSpaces !== undefined) {
          parts.push(`allQueuesFromSpaces: ${scope.allQueuesFromSpaces}`);
        }
        return `${prettyQuery(query.query)}.from({ ${parts.join(', ')} })`;
      }
      return `${prettyQuery(query.query)}.from(${prettyQuery(query.from.query)})`;
    }
    case 'limit':
      return `${prettyQuery(query.query)}.limit(${query.limit})`;
  }
};
