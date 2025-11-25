//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';
import type * as Types from 'effect/Types';

import { type ForeignKey, type QueryAST } from '@dxos/echo-protocol';
import { assertArgument } from '@dxos/invariant';
import { DXN, ObjectId } from '@dxos/keys';
import { type Intersection } from '@dxos/util';

import type * as Obj from '../Obj';
import * as Ref from '../Ref';
import type * as Type from '../Type';

import { getTypeDXNFromSpecifier } from './util';

export interface Filter<T> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Filter': { value: Types.Contravariant<T> };

  ast: QueryAST.Filter;
}

interface FilterAPI {
  is(value: unknown): value is Filter.Any;

  /** Construct a filter from an ast. */
  fromAst(ast: QueryAST.Filter): Filter<Obj.Any>;

  /**
   * Filter that matches all objects.
   */
  // TODO(dmaretskyi): `Obj.Any` would be more type-safe, but causes annoying errors in existing code
  everything(): Filter<Obj.AnyProps>;

  /**
   * Filter that matches no objects.
   */
  // TODO(dmaretskyi): Filter<never>?
  nothing(): Filter<any>;

  /**
   * Filter by object IDs.
   */
  // TODO(dmaretskyi): Rename to `Filter.id`.
  ids(...id: ObjectId[]): Filter<Obj.AnyProps>;

  /**
   * Filter by type.
   */
  type<S extends Schema.Schema.All>(
    schema: S | string,
    props?: Filter.Props<Schema.Schema.Type<S>>,
  ): Filter<Schema.Schema.Type<S>>;

  /**
   * Filter by non-qualified typename.
   */
  typename(typename: string): Filter<Obj.AnyProps>;

  /**
   * Filter by fully qualified type DXN.
   */
  typeDXN(dxn: DXN): Filter<Obj.AnyProps>;

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
    options?: Filter.TextSearchOptions,
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
  contains<T>(value: T): Filter<readonly T[] | undefined>;

  /**
   * Predicate for property to be in the provided range.
   * @param from - Start of the range (inclusive).
   * @param to - End of the range (exclusive).
   */
  between<T>(from: T, to: T): Filter<unknown>;

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
  type And<FS extends readonly Any[]> = Schema.Simplify<Intersection<{ [K in keyof FS]: Type<FS[K]> }>>;
  type Or<FS extends readonly Any[]> = Schema.Simplify<{ [K in keyof FS]: Type<FS[K]> }[number]>;

  export type TextSearchOptions = {
    // TODO(dmaretskyi): Hybrid search.
    type?: 'full-text' | 'vector';
  };
}

// TODO(dmaretskyi): Separate object instead of statics for better devex with type errors.
export class FilterClass implements Filter<any> {
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
    schema: S | string,
    props?: Filter.Props<Schema.Schema.Type<S>>,
  ): Filter<Schema.Schema.Type<S>> {
    const dxn = getTypeDXNFromSpecifier(schema);
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

  static text(text: string, options?: Filter.TextSearchOptions): Filter<any> {
    return new FilterClass({
      type: 'text-search',
      text,
      searchKind: options?.type,
    });
  }

  static foreignKeys<S extends Schema.Schema.All>(
    schema: S | string,
    keys: ForeignKey[],
  ): Filter<Schema.Schema.Type<S>> {
    const dxn = getTypeDXNFromSpecifier(schema);
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

  static contains<T>(value: T): Filter<readonly T[] | undefined> {
    return new FilterClass({
      type: 'contains',
      value,
    });
  }

  static between<T>(from: T, to: T): Filter<unknown> {
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
