//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import type { Filter as Filter$, Obj as Obj$, Order as Order$, Query as Query$, Ref, Type as Type$ } from '@dxos/echo';
import type { ForeignKey, QueryAST } from '@dxos/echo-protocol';
import { assertArgument } from '@dxos/invariant';
// `DXN`/`EID` are type-only imports to keep the `query-lite` bundle free of
// `effect/Schema` (which pulls runtime helpers QuickJS can't parse — e.g. private class fields).
import type { DXN, EID, EntityId, URI } from '@dxos/keys';

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
  export const updated = <T>(direction: QueryAST.OrderDirection = 'desc'): Order$.Order<T> =>
    new OrderClass({
      kind: 'timestamp',
      field: 'updatedAt',
      direction,
    });
  export const created = <T>(direction: QueryAST.OrderDirection = 'desc'): Order$.Order<T> =>
    new OrderClass({
      kind: 'timestamp',
      field: 'createdAt',
      direction,
    });
}

const Order2: typeof Order$ = Order1;
export { Order2 as Order };

// Local filter-match helpers used by FilterClass.toPredicate.
// Written without a runtime @dxos/echo import so the QuickJS sandbox bundle stays clean.
const _filterMatchValueLocal = (filter: QueryAST.Filter, value: unknown): boolean => {
  switch (filter.type) {
    case 'compare': {
      switch (filter.operator) {
        case 'eq':
          return value === filter.value;
        case 'neq':
          return value !== filter.value;
        case 'gt':
          return (value as any) > (filter.value as any);
        case 'gte':
          return (value as any) >= (filter.value as any);
        case 'lt':
          return (value as any) < (filter.value as any);
        case 'lte':
          return (value as any) <= (filter.value as any);
        default:
          return false;
      }
    }
    case 'object': {
      if (typeof value !== 'object' || value === null) {
        return false;
      }
      if (filter.props) {
        for (const [key, vf] of Object.entries(filter.props)) {
          if (!_filterMatchValueLocal(vf, (value as any)[key])) {
            return false;
          }
        }
      }
      return true;
    }
    case 'in':
      return filter.values.includes(value);
    case 'range':
      return (value as any) >= filter.from && (value as any) <= filter.to;
    case 'not':
      return !_filterMatchValueLocal(filter.filter, value);
    case 'and':
      return filter.filters.every((f) => _filterMatchValueLocal(f, value));
    case 'or':
      return filter.filters.some((f) => _filterMatchValueLocal(f, value));
    default:
      return false;
  }
};

const _filterMatchEntityLocal = (filter: QueryAST.Filter, entity: any): boolean => {
  switch (filter.type) {
    case 'object': {
      if (filter.typename !== null) {
        const typeURI: string | undefined = entity?.['@type'] ?? entity?.system?.type;
        if (!typeURI || typeURI !== filter.typename) {
          return false;
        }
      }
      if (filter.id && filter.id.length > 0 && !filter.id.includes(entity?.id)) {
        return false;
      }
      if (filter.props) {
        for (const [key, vf] of Object.entries(filter.props)) {
          if (key.startsWith('@')) {
            continue;
          }
          if (!_filterMatchValueLocal(vf, entity?.[key])) {
            return false;
          }
        }
      }
      return true;
    }
    case 'not':
      return !_filterMatchEntityLocal(filter.filter, entity);
    case 'and':
      return filter.filters.every((f) => _filterMatchEntityLocal(f, entity));
    case 'or':
      return filter.filters.some((f) => _filterMatchEntityLocal(f, entity));
    default:
      throw new Error(`Filter type '${(filter as any).type}' is not supported in toPredicate.`);
  }
};

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

  static id(...ids: EntityId[]): Filter$.Any {
    // assertArgument(
    //   ids.every((id) => EntityId.isValid(id)),
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

  static type<T extends Type$.AnyEntity>(
    type: T,
    props?: Filter$.Props<Type$.InstanceType<T>>,
  ): Filter$.Filter<Type$.InstanceType<T>>;
  static type(schema: string, props?: Filter$.Props<unknown>): Filter$.Filter<any>;
  static type(schema: Type$.AnyEntity | string, props?: Filter$.Props<unknown>): Filter$.Filter<unknown> {
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

  static typeURI(uri: URI.URI): Filter$.Any {
    return new FilterClass({
      type: 'object',
      typename: uri,
      props: {},
    });
  }

  static tag(tag: string): Filter$.Any {
    return new FilterClass({
      type: 'tag',
      tag,
    });
  }

  static key(key: string, options?: Filter$.KeyFilterOptions): Filter$.Any {
    return new FilterClass({
      type: 'object',
      typename: null,
      props: {},
      metaKey: key,
      metaVersion: options?.version,
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

  static foreignKeys<S extends Type$.AnyEntity | string>(
    schema: S,
    keys: ForeignKey[],
  ): Filter$.Filter<S extends Type$.AnyEntity ? Type$.InstanceType<S> : unknown> {
    assertArgument(typeof schema === 'string', 'schema');
    assertArgument(!schema.startsWith('dxn:'), 'schema');
    return new FilterClass({
      type: 'object',
      typename: makeTypeDxn(schema),
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

  static in<T>(...values: T[]): Filter$.Filter<T> {
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

  static between<T>(from: T, to: T): Filter$.Filter<T> {
    return new FilterClass({
      type: 'range',
      from,
      to,
    });
  }

  static updated(range: { after?: Date | number; before?: Date | number }): Filter$.Any {
    return FilterClass._timeRangeFilter('updatedAt', range);
  }

  static created(range: { after?: Date | number; before?: Date | number }): Filter$.Any {
    return FilterClass._timeRangeFilter('createdAt', range);
  }

  static childOf(parents: unknown | unknown[], options?: { transitive?: boolean }): Filter$.Any {
    const items = Array.isArray(parents) ? parents : [parents];
    const dxns = items.map((item) => {
      if (isEchoUriLike(item)) {
        return item.toString() as EID.EID;
      }
      throw new TypeError('childOf requires EID values in query-lite');
    });
    return new FilterClass({
      type: 'child-of',
      parents: dxns,
      transitive: options?.transitive ?? true,
    });
  }

  private static _timeRangeFilter(
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

  /** Create a predicate from a filter. */
  // Cast required: TypeScript cannot verify a plain overloaded function satisfies a type-predicate
  // overload signature without the cast; Effect's dual() has the same limitation here.
  static toPredicate = ((entityOrFilter: any, filter?: any): any => {
    if (filter === undefined) {
      return (entity: any) => _filterMatchEntityLocal(entityOrFilter.ast, entity);
    }
    return _filterMatchEntityLocal(filter.ast, entityOrFilter);
  }) as typeof Filter$.toPredicate;

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
  let idFilter: readonly EntityId[] | undefined;
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

  static type<S extends Schema.Schema.All>(
    schema: S,
    predicates?: Filter$.Props<Schema.Schema.Type<S>>,
  ): Query$.Query<Schema.Schema.Type<S>>;
  static type(type: Type$.Type, predicates?: Filter$.Props<Obj$.Unknown>): Query$.Query<Obj$.Unknown>;
  static type(schema: string, predicates?: Filter$.Props<unknown>): Query$.Query<any>;
  static type(schema: Schema.Schema.All | Type$.Type | string, predicates?: Filter$.Props<unknown>): Query$.Any {
    if (typeof schema !== 'string') {
      throw new TypeError('expected typename as the first paramter');
    }
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

  static from(...args: any[]): Query$.Any {
    const baseQuery: QueryAST.Query = {
      type: 'select',
      filter: FilterClass.everything().ast,
    };
    const wrapper = new QueryClass(baseQuery);
    return (wrapper.from as (...args: any[]) => Query$.Any)(...args);
  }

  from(...args: any[]): Query$.Any {
    // Variadic raw scopes: `.from(Scope.space(), Scope.registry())`.
    if (args.length > 1 && args.every((arg) => _isScopeLike(arg))) {
      return new QueryClass({
        type: 'from',
        query: this.ast,
        from: { _tag: 'scope', scopes: args as QueryAST.Scope[] },
      });
    }

    const [arg] = args;
    if (arg === 'all-accessible-spaces') {
      return new QueryClass({
        type: 'from',
        query: this.ast,
        from: { _tag: 'scope', scopes: [] },
      });
    }

    if (_isScopeLike(arg)) {
      return new QueryClass({
        type: 'from',
        query: this.ast,
        from: { _tag: 'scope', scopes: Array.isArray(arg) ? arg : [arg] },
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

  referencedBy(target?: Type$.AnyEntity | string, key?: string): Query$.Any {
    if (target !== undefined && typeof target !== 'string') {
      throw new TypeError('referencedBy requires a typename string in query-lite');
    }
    const typename = target !== undefined ? makeTypeDxn(target) : null;
    return new QueryClass({
      type: 'incoming-references',
      anchor: this.ast,
      property: key ?? null,
      typename,
    });
  }

  sourceOf(
    relation?: Type$.Relation<any, any, any, any> | string,
    predicates?: Filter$.Props<unknown> | undefined,
  ): Query$.Any {
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'outgoing',
      filter:
        relation === undefined
          ? undefined
          : typeof relation === 'string'
            ? FilterClass.type(relation, predicates).ast
            : FilterClass.type(relation, predicates).ast,
    });
  }

  targetOf(
    relation?: Type$.Relation<any, any, any, any> | string,
    predicates?: Filter$.Props<unknown> | undefined,
  ): Query$.Any {
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'incoming',
      filter:
        relation === undefined
          ? undefined
          : typeof relation === 'string'
            ? FilterClass.type(relation, predicates).ast
            : FilterClass.type(relation, predicates).ast,
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

  debugLabel(label: string): Query$.Any {
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

export const Query1: typeof Query$ = QueryClass;
export { Query1 as Query };

const RefTypeId: unique symbol = Symbol('@dxos/echo-query/Ref');
const isRef = (obj: any): obj is Ref.Ref<any> => {
  return obj && typeof obj === 'object' && RefTypeId in obj;
};

const makeTypeDxn = (typename: string): DXN.DXN => {
  assertArgument(typeof typename === 'string', 'typename');
  assertArgument(!typename.startsWith('dxn:'), 'typename');
  // Inline template (rather than `DXN.make`) to keep the value-side `@dxos/keys` import out of this bundle.
  return `dxn:${typename}` as DXN.DXN;
};

const isDxnLike = (value: unknown): value is DXN.DXN => {
  if (typeof value === 'string') {
    return value.startsWith('dxn:');
  }
  return (
    typeof value === 'object' &&
    value !== null &&
    'toString' in value &&
    typeof value.toString === 'function' &&
    value.toString().startsWith('dxn:')
  );
};

const isEchoUriLike = (value: unknown): value is EID.EID => {
  if (typeof value === 'string') {
    return value.startsWith('echo:');
  }
  return (
    typeof value === 'object' &&
    value !== null &&
    'toString' in value &&
    typeof value.toString === 'function' &&
    isEchoUriLike(value.toString())
  );
};

const SCOPE_TAGS = new Set(['space', 'feed', 'registry']);

const _isScopeLike = (value: unknown): value is QueryAST.Scope | QueryAST.Scope[] => {
  if (Array.isArray(value)) {
    return value.every((item) => _isSingleScopeLike(item));
  }
  return _isSingleScopeLike(value);
};

const _isSingleScopeLike = (value: unknown): value is QueryAST.Scope => {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    '_tag' in value &&
    typeof value._tag === 'string' &&
    SCOPE_TAGS.has(value._tag)
  );
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
    case 'child-of':
      return `Filter.childOf([${filter.parents.map((parent) => JSON.stringify(parent)).join(', ')}], { transitive: ${filter.transitive} })`;
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
        if (o.kind === 'timestamp') {
          const fn = o.field === 'updatedAt' ? 'updated' : 'created';
          return `Order.${fn}(${JSON.stringify(o.direction)})`;
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
      if (query.options.debugLabel !== undefined) {
        parts.push(`debugLabel: ${JSON.stringify(query.options.debugLabel)}`);
      }
      return `${prettyQuery(query.query)}.options({ ${parts.join(', ')} })`;
    }
    case 'from': {
      if (query.from._tag === 'scope') {
        if (query.from.scopes.length === 0) {
          return `${prettyQuery(query.query)}.from('all-accessible-spaces')`;
        }
        const scopeStrs = query.from.scopes.map((scope) => {
          if (scope._tag === 'space') {
            return scope.includeAllFeeds
              ? `{ space: ${JSON.stringify(scope.spaceId)}, includeAllFeeds: true }`
              : `{ space: ${JSON.stringify(scope.spaceId)} }`;
          }
          if (scope._tag === 'feed') {
            return `{ feed: ${String(scope.feedUri)} }`;
          }
          return `{ registry: ${JSON.stringify(scope.location)} }`;
        });
        return `${prettyQuery(query.query)}.from([${scopeStrs.join(', ')}])`;
      }
      return `${prettyQuery(query.query)}.from(${prettyQuery(query.from.query)})`;
    }
    case 'limit':
      return `${prettyQuery(query.query)}.limit(${query.limit})`;
  }
};
