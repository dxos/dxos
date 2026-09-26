//
// Copyright 2026 DXOS.org
//

import { type Filter, Obj, type QueryAST } from '@dxos/echo';

export type MatchFilterOptions<T extends Obj.Unknown> = {
  /**
   * The strings a free-text term searches. Defaults to the object's top-level string properties;
   * a host narrows it to what a reader sees (a task's title and description, say).
   */
  text?: (object: T) => readonly (string | undefined)[];
  /** The object's tag ids — the uri space `#tag` terms carry. Defaults to `Obj.getMeta(object).tags`. */
  tags?: (object: T) => readonly string[];
};

/**
 * Evaluates a filter the {@link QueryBuilder} built against one object in memory.
 *
 * For a host that cannot hand the filter to a query: one that renders a tree and must keep the
 * ancestors of a match, or reads a feed the query engine does not index. Semantics follow what a
 * reader typed rather than the query engine's equality: a string property matches as a
 * case-insensitive substring (`status:start` finds `started`), an array on any element, and an
 * object on any field (`assignee:rich` finds an actor's name or email). An unknown node fails
 * closed, so a filter the evaluator does not understand never broadens the result.
 */
export const matchesFilter = <T extends Obj.Unknown>(
  filter: Filter.Any,
  object: T,
  options: MatchFilterOptions<T> = {},
): boolean => matchesAst(filter.ast, object, options);

const matchesAst = <T extends Obj.Unknown>(
  ast: QueryAST.Filter,
  object: T,
  options: MatchFilterOptions<T>,
): boolean => {
  switch (ast.type) {
    case 'and':
      return ast.filters.every((sub) => matchesAst(sub, object, options));
    case 'or':
      return ast.filters.some((sub) => matchesAst(sub, object, options));
    case 'not':
      return !matchesAst(ast.filter, object, options);
    case 'tag':
      return (options.tags ?? metaTags)(object).includes(ast.tag);
    case 'text-search':
      return matchesText(ast.text, (options.text ?? stringProperties)(object));
    case 'object': {
      // `typename` is null for `Filter.everything()`/`Filter.props()`, which match any type.
      if (ast.typename && !typeMatches(ast.typename, typeUri(object))) {
        return false;
      }
      // An `id:` term lands here rather than in `props`, so a filter naming one id would otherwise
      // match every object.
      if (ast.id && !ast.id.includes(object.id)) {
        return false;
      }
      return Object.entries(ast.props).every(([key, predicate]) => matchesPredicate(predicate, getPath(object, key)));
    }
    default:
      return false;
  }
};

/** A property's value against the predicate a `key:value` term or an object literal built. */
const matchesPredicate = (predicate: QueryAST.Filter, value: unknown): boolean => {
  switch (predicate.type) {
    case 'compare':
      switch (predicate.operator) {
        case 'eq':
          return matchesValue(value, predicate.value);
        case 'neq':
          return !matchesValue(value, predicate.value);
        default:
          return compareOrdered(value, predicate.value, predicate.operator);
      }
    case 'object':
      // A nested literal (`{ address: { city: … } }`) narrows the value's own fields.
      return (
        isRecord(value) &&
        Object.entries(predicate.props).every(([key, sub]) => matchesPredicate(sub, getPath(value, key)))
      );
    case 'and':
      return predicate.filters.every((sub) => matchesPredicate(sub, value));
    case 'or':
      return predicate.filters.some((sub) => matchesPredicate(sub, value));
    case 'not':
      return !matchesPredicate(predicate.filter, value);
    default:
      return false;
  }
};

/**
 * Strings match as case-insensitive substrings, arrays on any element, objects on any field; any
 * other value only by identity.
 */
const matchesValue = (value: unknown, query: unknown): boolean => {
  if (value === query) {
    return true;
  }
  if (typeof query === 'string' && typeof value === 'string') {
    return value.toLowerCase().includes(query.toLowerCase());
  }
  if (Array.isArray(value)) {
    return value.some((entry) => matchesValue(entry, query));
  }
  if (typeof query === 'string' && isRecord(value)) {
    return Object.values(value).some((entry) => matchesValue(entry, query));
  }
  return false;
};

/** Ordering holds only between two numbers or two strings; anything else matches nothing. */
const compareOrdered = (value: unknown, query: unknown, operator: 'gt' | 'gte' | 'lt' | 'lte'): boolean => {
  if (typeof value === 'number' && typeof query === 'number') {
    return compare(value, query, operator);
  }
  if (typeof value === 'string' && typeof query === 'string') {
    return compare(value, query, operator);
  }
  return false;
};

const compare = <V extends number | string>(value: V, query: V, operator: 'gt' | 'gte' | 'lt' | 'lte'): boolean => {
  switch (operator) {
    case 'gt':
      return value > query;
    case 'gte':
      return value >= query;
    case 'lt':
      return value < query;
    case 'lte':
      return value <= query;
  }
};

const matchesText = (needle: string, haystacks: readonly (string | undefined)[]): boolean => {
  if (!needle) {
    return true;
  }
  const lower = needle.toLowerCase();
  return haystacks.some((haystack) => haystack?.toLowerCase().includes(lower));
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const getPath = (object: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, key) => (isRecord(current) ? current[key] : undefined), object);

// The id is not text a reader wrote, so a word that happens to occur in one does not match.
const stringProperties = (object: Obj.Unknown): string[] =>
  Object.entries(object).flatMap(([key, value]) => (key !== 'id' && typeof value === 'string' ? [value] : []));

const metaTags = (object: Obj.Unknown): string[] => {
  try {
    return Obj.getMeta(object).tags.map((tag) => tag.uri);
  } catch {
    // An object outside a database carries no meta; a tag term then matches nothing rather than throwing.
    return [];
  }
};

/**
 * A `type:` term names a type without a version (`dxn:org.example.person`), while an object's type
 * carries one (`dxn:org.example.person:0.1.0`), so an unversioned name matches every version.
 */
const typeMatches = (typename: string, uri: string | undefined): boolean =>
  uri !== undefined && (uri === typename || uri.startsWith(`${typename}:`));

const typeUri = (object: Obj.Unknown): string | undefined => {
  try {
    return Obj.getTypeURI(object)?.toString();
  } catch {
    return undefined;
  }
};
