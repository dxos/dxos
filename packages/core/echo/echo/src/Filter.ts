//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';
import type * as Types from 'effect/Types';

import { type ForeignKey, type QueryAST } from '@dxos/echo-protocol';
import { assertArgument } from '@dxos/invariant';
import { DXN, ObjectId } from '@dxos/keys';

import { getTypeDXNFromSpecifier } from './internal';
import * as Ref from './Ref';

export interface Filter<T> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Filter': { value: Types.Contravariant<T> };

  ast: QueryAST.Filter;
}

export type Props<T> = {
  // Predicate or a value as a shorthand for `eq`.
  [K in keyof T & string]?: Filter<T[K]> | T[K];
};

export type Any = Filter<any>;

export type Type<F extends Any> = F extends Filter<infer T> ? T : never;

class FilterClass implements Any {
  private static variance: Any['~Filter'] = {} as Any['~Filter'];

  constructor(public readonly ast: QueryAST.Filter) {}

  '~Filter' = FilterClass.variance;
}

export const is = (value: unknown): value is Any => {
  return typeof value === 'object' && value !== null && '~Filter' in value;
};

/** Construct a filter from an ast. */
export const fromAst = (ast: QueryAST.Filter): Any => {
  return new FilterClass(ast);
};

/**
 * Filter that matches all objects.
 */
// TODO(dmaretskyi): `Entity.Any` would be more type-safe, but causes annoying errors in existing code
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

/*
 * Filter by object IDs.
 */
// TODO(dmaretskyi): Rename to `Filter.id`.
export const ids = (...ids: ObjectId[]): Any => {
  assertArgument(
    ids.every((id) => ObjectId.isValid(id)),
    'ids',
    'ids must be valid',
  );

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

/**
 * Filter by type.
 */
export const type = <S extends Schema.Schema.All>(
  schema: S | string,
  props?: Props<Schema.Schema.Type<S>>,
): Filter<Schema.Schema.Type<S>> => {
  const dxn = getTypeDXNFromSpecifier(schema);
  return new FilterClass({
    type: 'object',
    typename: dxn.toString(),
    ...propsFilterToAst(props ?? {}),
  });
};

/**
 * Filter by non-qualified typename.
 */
export const typename = (typename: string): Any => {
  assertArgument(!typename.startsWith('dxn:'), 'typename', 'Typename must no be qualified');
  return new FilterClass({
    type: 'object',
    typename: DXN.fromTypename(typename).toString(),
    props: {},
  });
};

/**
 * Filter by fully qualified type DXN.
 */
export const typeDXN = (dxn: DXN): Any => {
  return new FilterClass({
    type: 'object',
    typename: dxn.toString(),
    props: {},
  });
};

/**
 * Filter by tag.
 */
export const tag = (tag: string): Any => {
  return new FilterClass({
    type: 'tag',
    tag,
  });
};

/**
 * Filter by properties.
 */
export const props = <T>(props: Props<T>): Filter<T> => {
  return new FilterClass({
    type: 'object',
    typename: null,
    ...propsFilterToAst(props),
  });
};

export type TextSearchOptions = {
  // TODO(dmaretskyi): Hybrid search.
  type?: 'full-text' | 'vector';
};

/**
 * Full-text or vector search.
 */
export const text = (
  // TODO(dmaretskyi): Consider passing a vector here, but really the embedding should be done on the query-executor side.
  text: string,
  options?: TextSearchOptions,
): Any => {
  return new FilterClass({
    type: 'text-search',
    text,
    searchKind: options?.type,
  });
};

/**
 * Filter by foreign keys.
 */
export const foreignKeys = <S extends Schema.Schema.All>(
  schema: S | string,
  keys: ForeignKey[],
): Filter<Schema.Schema.Type<S>> => {
  const dxn = getTypeDXNFromSpecifier(schema);
  return new FilterClass({
    type: 'object',
    typename: dxn.toString(),
    props: {},
    foreignKeys: keys,
  });
};

/**
 * Predicate for property to be equal to the provided value.
 */
export const eq = <T>(value: T): Filter<T | undefined> => {
  if (!Ref.isRef(value) && typeof value === 'object' && value !== null) {
    throw new TypeError('Cannot use object as a value for eq filter');
  }

  return new FilterClass({
    type: 'compare',
    operator: 'eq',
    value: Ref.isRef(value) ? value.noInline().encode() : value,
  });
};

/**
 * Predicate for property to be not equal to the provided value.
 */
export const neq = <T>(value: T): Filter<T | undefined> => {
  return new FilterClass({
    type: 'compare',
    operator: 'neq',
    value,
  });
};

/**
 * Predicate for property to be greater than the provided value.
 */
export const gt = <T>(value: T): Filter<T | undefined> => {
  return new FilterClass({
    type: 'compare',
    operator: 'gt',
    value,
  });
};

/**
 * Predicate for property to be greater than or equal to the provided value.
 */
export const gte = <T>(value: T): Filter<T | undefined> => {
  return new FilterClass({
    type: 'compare',
    operator: 'gte',
    value,
  });
};

/**
 * Predicate for property to be less than the provided value.
 */
export const lt = <T>(value: T): Filter<T | undefined> => {
  return new FilterClass({
    type: 'compare',
    operator: 'lt',
    value,
  });
};

/**
 * Predicate for property to be less than or equal to the provided value.
 */
export const lte = <T>(value: T): Filter<T | undefined> => {
  return new FilterClass({
    type: 'compare',
    operator: 'lte',
    value,
  });
};

/**
 * Predicate for property to be in the provided array.
 * @param values - Values to check against.
 */
const in_ = <T>(...values: T[]): Filter<T | undefined> => {
  return new FilterClass({
    type: 'in',
    values,
  });
};
export { in_ as in };

/**
 * Predicate for an array property to contain the provided value.
 * @param value - Value to check against.
 */
export const contains = <T>(value: T): Filter<readonly T[] | undefined> => {
  return new FilterClass({
    type: 'contains',
    value,
  });
};

/**
 * Predicate for property to be in the provided range.
 * @param from - Start of the range (inclusive).
 * @param to - End of the range (exclusive).
 */
export const between = <T>(from: T, to: T): Filter<unknown> => {
  return new FilterClass({
    type: 'range',
    from,
    to,
  });
};

/**
 * Negate the filter.
 */
export const not = <F extends Any>(filter: F): Filter<Type<F>> => {
  return new FilterClass({
    type: 'not',
    filter: filter.ast,
  });
};

/**
 * Combine filters with a logical AND.
 */
export const and = <Filters extends readonly Any[]>(...filters: Filters): Filter<Type<Filters[number]>> => {
  return new FilterClass({
    type: 'and',
    filters: filters.map((f) => f.ast),
  });
};

/**
 * Combine filters with a logical OR.
 */
export const or = <Filters extends readonly Any[]>(...filters: Filters): Filter<Type<Filters[number]>> => {
  return new FilterClass({
    type: 'or',
    filters: filters.map((f) => f.ast),
  });
};

// TODO(dmaretskyi): Add `Filter.match` to support pattern matching on string props.

const propsFilterToAst = (predicates: Props<any>): Pick<QueryAST.FilterObject, 'id' | 'props'> => {
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
    Match.when(is, (predicate) => predicate.ast),
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
    Match.orElse((value) => eq(value).ast),
  );
};
