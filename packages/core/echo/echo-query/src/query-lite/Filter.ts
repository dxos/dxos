//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import type { DXN, Filter as Filter$, Key, QueryAST } from '@dxos/echo';
import type { ForeignKey } from '@dxos/echo-protocol';
import { assertArgument } from '@dxos/invariant';

import { isRef, makeTypeDxn } from './util';

class FilterClass implements Filter$.Any {
  private static variance: Filter$.Any['~Filter'] = {} as Filter$.Any['~Filter'];

  constructor(public readonly ast: QueryAST.Filter) {}

  '~Filter' = FilterClass.variance;
}

export const is = (value: unknown): value is Filter$.Any => {
  return typeof value === 'object' && value !== null && '~Filter' in value;
};

export const fromAst = (ast: QueryAST.Filter): Filter$.Any => {
  return new FilterClass(ast);
};

export const everything = (): FilterClass => {
  return new FilterClass({
    type: 'object',
    typename: null,
    props: {},
  });
};

export const nothing = (): FilterClass => {
  return new FilterClass({
    type: 'not',
    filter: {
      type: 'object',
      typename: null,
      props: {},
    },
  });
};

export const relation = () => {
  return new FilterClass({
    type: 'object',
    typename: null,
    props: {},
  });
};

export const id = (...ids: Key.ObjectId[]): Filter$.Any => {
  // assertArgument(
  //   ids.every((id) => ObjectId.isValid(id)),
  //   'ids',
  //   'ids must be valid',
  // );

  if (ids.length === 0) {
    return nothing();
  }

  return new FilterClass({
    type: 'object',
    typename: null,
    id: ids,
    props: {},
  });
};

export const type = <S extends Schema.Schema.All>(
  schema: S | string,
  props?: Filter$.Props<Schema.Schema.Type<S>>,
): Filter$.Filter<Schema.Schema.Type<S>> => {
  if (typeof schema !== 'string') {
    throw new TypeError('expected typename as the first paramter');
  }
  return new FilterClass({
    type: 'object',
    typename: makeTypeDxn(schema),
    ...propsFilterToAst(props ?? {}),
  });
};

export const typename = (typename: string): Filter$.Any => {
  return new FilterClass({
    type: 'object',
    typename: makeTypeDxn(typename),
    props: {},
  });
};

export const typeDXN = (dxn: DXN): Filter$.Any => {
  return new FilterClass({
    type: 'object',
    typename: dxn.toString(),
    props: {},
  });
};

export const tag = (tag: string): Filter$.Any => {
  return new FilterClass({
    type: 'tag',
    tag,
  });
};

export const props = <T>(props: Filter$.Props<T>): Filter$.Filter<T> => {
  return new FilterClass({
    type: 'object',
    typename: null,
    ...propsFilterToAst(props),
  });
};

export const text = (text: string, options?: Filter$.TextSearchOptions): Filter$.Any => {
  return new FilterClass({
    type: 'text-search',
    text,
    searchKind: options?.type,
  });
};

export const foreignKeys = <S extends Schema.Schema.All>(
  schema: S | string,
  keys: ForeignKey[],
): Filter$.Filter<Schema.Schema.Type<S>> => {
  assertArgument(typeof schema === 'string', 'schema');
  assertArgument(!schema.startsWith('dxn:'), 'schema');
  return new FilterClass({
    type: 'object',
    typename: `dxn:type:${schema}`,
    props: {},
    foreignKeys: keys,
  });
};

export const eq = <T>(value: T): Filter$.Filter<T> => {
  if (!isRef(value) && typeof value === 'object' && value !== null) {
    throw new TypeError('Cannot use object as a value for eq filter');
  }

  return new FilterClass({
    type: 'compare',
    operator: 'eq',
    value: isRef(value) ? value.noInline().encode() : value,
  });
};

export const neq = <T>(value: T): Filter$.Filter<T> => {
  return new FilterClass({
    type: 'compare',
    operator: 'neq',
    value,
  });
};

export const gt = <T>(value: T): Filter$.Filter<T> => {
  return new FilterClass({
    type: 'compare',
    operator: 'gt',
    value,
  });
};

export const gte = <T>(value: T): Filter$.Filter<T> => {
  return new FilterClass({
    type: 'compare',
    operator: 'gte',
    value,
  });
};

export const lt = <T>(value: T): Filter$.Filter<T> => {
  return new FilterClass({
    type: 'compare',
    operator: 'lt',
    value,
  });
};

export const lte = <T>(value: T): Filter$.Filter<T> => {
  return new FilterClass({
    type: 'compare',
    operator: 'lte',
    value,
  });
};

const in$ = <T>(...values: T[]): Filter$.Filter<T> => {
  return new FilterClass({
    type: 'in',
    values,
  });
};
export { in$ as in };

export const contains = <T>(value: T): Filter$.Filter<readonly T[] | undefined> => {
  return new FilterClass({
    type: 'contains',
    value,
  });
};

export const between = <T>(from: T, to: T): Filter$.Filter<unknown> => {
  return new FilterClass({
    type: 'range',
    from,
    to,
  });
};

export const not = <F extends Filter$.Any>(filter: F): Filter$.Filter<Filter$.Type<F>> => {
  return new FilterClass({
    type: 'not',
    filter: filter.ast,
  });
};

export const and = <T>(...filters: Filter$.Filter<T>[]): Filter$.Filter<T> => {
  return new FilterClass({
    type: 'and',
    filters: filters.map((f) => f.ast),
  });
};

export const or = <T>(...filters: Filter$.Filter<T>[]): Filter$.Filter<T> => {
  return new FilterClass({
    type: 'or',
    filters: filters.map((f) => f.ast),
  });
};

const propsFilterToAst = (predicates: Filter$.Props<any>): Pick<QueryAST.FilterObject, 'id' | 'props'> => {
  let idFilter: readonly Key.ObjectId[] | undefined;
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
  if (is(predicate)) {
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

  return eq(predicate).ast;
};
