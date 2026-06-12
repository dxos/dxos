//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import type * as Types from 'effect/Types';

import { type ForeignKey, type QueryAST } from '@dxos/echo-protocol';
import { assertArgument } from '@dxos/invariant';
import { DXN, EID, EntityId, SpaceId, type URI } from '@dxos/keys';

import * as internal from './internal';
import type * as Obj from './Obj';
import * as Ref from './Ref';
// eslint-disable-next-line @dxos/rules/import-as-namespace
import type * as Type$ from './Type';

export interface Filter<T> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Filter': { value: Types.Covariant<T> };

  ast: QueryAST.Filter;
}

export type Props<T> = {
  // Predicate or a value as a shorthand for `eq`.
  [K in keyof T & string]?: Filter<T[K]> | T[K];
};

export type Any = Filter<any>;

export type Type<F extends Any> = F extends Filter<infer T> ? T : never;

class FilterClass implements Any {
  private static 'variance': Any['~Filter'] = {} as Any['~Filter'];

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

/**
 * Filter that matches no objects.
 */
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

/*
 * Filter by EntityId.
 */
export const id = (...ids: EntityId[]): Any => {
  assertArgument(
    ids.every((id) => EntityId.isValid(id)),
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
 *
 * Accepts a `Type.Type` entity (the value produced by `Type.makeObject` /
 * `Type.makeRelation`), a `Schema.Union` of such entities (for filtering across a
 * union of ECHO types), or a non-qualified typename string.
 */
export const type: {
  <T extends Type$.AnyEntity>(type: T, props?: Props<Type$.InstanceType<T>>): Filter<Type$.InstanceType<T>>;
  // Schema-side overload restricted to the well-known unknown schemas and to
  // `Schema.Union(...)` of `Type.Type` entities (for filtering across a union
  // of ECHO types). Other raw schemas are rejected.
  <S extends internal.UnknownTypeSchema<any, any>>(
    schema: S,
    props?: Props<Schema.Schema.Type<S>>,
  ): Filter<Schema.Schema.Type<S>>;
  <S extends Schema.Union<readonly Schema.Schema.AnyNoContext[]>>(
    union: S,
    props?: Props<Schema.Schema.Type<S>>,
  ): Filter<Schema.Schema.Type<S>>;
  (schema: string, props?: Props<unknown>): Filter<any>;
  // Passthrough overload for callers that hold a `Type.AnyEntity | string` union
  // (e.g. Query.type / Query.sourceOf / Query.targetOf impls). Listed last so the
  // typed overloads above still win for monomorphic inputs.
  (input: Type$.AnyEntity | string, props?: Props<unknown>): Filter<unknown>;
} = (input: Type$.AnyEntity | Schema.Schema.AnyNoContext | string, props?: Props<unknown>): any => {
  if (Schema.isSchema(input) && SchemaAST.isUnion(input.ast)) {
    const typenames = input.ast.types.map((t) => internal.getTypeURIFromSpecifier(Schema.make(t)));
    return new FilterClass({
      type: 'or',
      filters: typenames.map((typename) => ({
        type: 'object',
        typename,
        props: {},
      })),
    });
  }

  const uri = internal.getTypeURIFromSpecifier(input);
  return new FilterClass({
    type: 'object',
    typename: uri,
    ...propsFilterToAst(props ?? {}),
  });
};

/**
 * Filter by a scheme-less type tag: a static typename (`com.example.task`), or — for a stored
 * (database) schema — its entity id, either bare (`<entityId>`, matches the object in any space)
 * or space-qualified (`<spaceId>:<entityId>`). Mirrors how a typename carries no `dxn:` scheme and
 * an echo identifier no `echo:` scheme; the tag is resolved to the matching URI here.
 */
export const typename = (typename: string): Any => {
  assertArgument(
    !typename.startsWith('dxn:') && !typename.startsWith('echo:'),
    'typename',
    'Type tag must be scheme-less',
  );
  return new FilterClass({
    type: 'object',
    typename: typeTagToUri(typename),
    props: {},
  });
};

/**
 * Resolves a scheme-less type tag to the URI stored on an object's `system.type`: a `<spaceId>:<entityId>`
 * or bare `<entityId>` tag becomes an `echo:` EID (stored schema), any other tag a typename DXN.
 */
const typeTagToUri = (tag: string): URI.URI => {
  const colon = tag.indexOf(':');
  if (colon > 0) {
    const space = tag.slice(0, colon);
    const entity = tag.slice(colon + 1);
    if (SpaceId.isValid(space) && EntityId.isValid(entity)) {
      return EID.make({ spaceId: space, entityId: entity });
    }
  }
  if (EntityId.isValid(tag)) {
    return EID.make({ entityId: tag });
  }
  return DXN.make(tag);
};

/**
 * Filter by fully qualified type URI — either a typename DXN (for static schemas) or
 * a schema-as-object EID (for stored dynamic schemas). See `getSchemaURI`.
 */
export const typeURI = (uri: URI.URI): Any => {
  return new FilterClass({
    type: 'object',
    typename: uri,
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
 * Options for {@link key} filter.
 */
export type KeyFilterOptions = {
  /**
   * Optional semver range expression (e.g. `^1.2.3`, `~2.0.0`, `>=1.0.0 <2.0.0`).
   * Matches the object's meta `version` field against the range.
   * If omitted, matches any version (including objects with no version).
   */
  version?: string;
};

/**
 * Filter by registry key stored in object meta.
 *
 * @example
 * ```ts
 * Filter.key('org.example.type.foo');
 * Filter.key('org.example.type.foo', { version: '^1.2.3' });
 * ```
 */
export const key = (key: string, options?: KeyFilterOptions): Any => {
  return new FilterClass({
    type: 'object',
    typename: null,
    props: {},
    metaKey: key,
    metaVersion: options?.version,
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
export const foreignKeys = <S extends Type$.AnyEntity | string>(
  schema: S,
  keys: ForeignKey[],
): Filter<S extends Type$.AnyEntity ? Type$.InstanceType<S> : unknown> => {
  const uri = internal.getTypeURIFromSpecifier(schema);
  return new FilterClass({
    type: 'object',
    typename: uri,
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
const in$ = <T>(...values: T[]): Filter<T> => {
  return new FilterClass({
    type: 'in',
    values,
  });
};
export { in$ as in };

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
export const between = <T>(from: T, to: T): Filter<T> => {
  return new FilterClass({
    type: 'range',
    from,
    to,
  });
};

type TimeRange = { after?: Date | number; before?: Date | number };

const _toUnixMs = (date: Date | number): number => (typeof date === 'number' ? date : date.getTime());

const _timeRangeFilter = (field: 'updatedAt' | 'createdAt', range: TimeRange): Any => {
  const filters: Any[] = [];
  if (range.after != null) {
    filters.push(new FilterClass({ type: 'timestamp', field, operator: 'gte', value: _toUnixMs(range.after) }));
  }
  if (range.before != null) {
    filters.push(new FilterClass({ type: 'timestamp', field, operator: 'lte', value: _toUnixMs(range.before) }));
  }
  if (filters.length === 0) {
    return everything();
  }
  return filters.length === 1 ? filters[0] : and(...filters);
};

/**
 * Filter objects by updatedAt timestamp.
 */
export const updated = (range: TimeRange): Any => _timeRangeFilter('updatedAt', range);

/**
 * Filter objects by createdAt timestamp.
 */
export const created = (range: TimeRange): Any => _timeRangeFilter('createdAt', range);

export type ChildOfOptions = {
  /** Whether to match transitively (grandchildren, etc.). Defaults to true. */
  transitive?: boolean;
};

/**
 * Filter objects that are children of the specified parent(s).
 * Accepts ECHO objects, Refs, or arrays of either.
 * Refs are resolved to DXNs without loading; objects use {@link Obj.getURI}.
 * With transitive=true (default), also matches grandchildren and beyond.
 */
export const childOf = (
  parents: Obj.Unknown | Ref.Unknown | readonly (Obj.Unknown | Ref.Unknown)[],
  options?: ChildOfOptions,
): Any => {
  const items = Array.isArray(parents) ? parents : [parents];
  const dxns = items.map((item) => {
    if (Ref.isRef(item)) {
      return EID.parse(item.uri);
    }
    return EID.parse(internal.getUri(item));
  });
  return new FilterClass({
    type: 'child-of',
    parents: dxns,
    transitive: options?.transitive ?? true,
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
  let idFilter: readonly EntityId[] | undefined;
  if ('id' in predicates) {
    assertArgument(
      typeof predicates.id === 'string' || Array.isArray(predicates.id),
      'predicates.id',
      'invalid id filter',
    );
    idFilter = typeof predicates.id === 'string' ? [predicates.id] : predicates.id;
    Schema.Array(EntityId).pipe(Schema.validateSync)(idFilter);
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

/**
 * Returns a human-readable string representation of a Filter AST.
 */
export const pretty = (filter: Any): string => internal.prettyFilter(filter.ast);
