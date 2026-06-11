//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';

import { URI } from '@dxos/keys';
import { WeakDictionary } from '@dxos/util';

import * as Database from '../../Database';
import type * as Entity from '../../Entity';
import type * as Filter from '../../Filter';
import * as Query from '../../Query';
import type * as QueryResult from '../../QueryResult';
import * as Registry from '../../Registry';

// Keyed by queryable identifier. Holds the Queryable weakly so it is collected with its space.
const queryableRegistry = new WeakDictionary<string, Database.Queryable>();

/**
 * Recursively sorts object keys before stringifying so that semantically identical ASTs
 * (whose key insertion orders may differ across call sites) produce the same string.
 */
const stableStringify = (value: unknown): string =>
  JSON.stringify(value, (_, val) => {
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      return Object.fromEntries(Object.entries(val as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)));
    }
    return val;
  });

// Separator that cannot appear in a queryable identifier (DXN/EID strings use colons, not '~').
const KEY_SEPARATOR = '~';

// Keyed by `<identifier>~<serialized-query-AST>` so the same queryable + query returns the same atom.
const queryFamily = Atom.family((key: string) => {
  // Split and parse once per key (not on every recompute).
  const separatorIndex = key.indexOf(KEY_SEPARATOR);
  const identifier = key.slice(0, separatorIndex);
  const serializedAst = key.slice(separatorIndex + 1);

  // Resolve the queryable once per key; the closure keeps it reachable for the family entry's lifetime.
  const queryable = queryableRegistry.get(identifier);
  if (!queryable) {
    return Atom.make(() => [] as Entity.Unknown[]);
  }

  const ast = JSON.parse(serializedAst);
  const queryResult = queryable.query(Query.fromAst(ast)) as QueryResult.QueryResult<Entity.Unknown>;

  return Atom.make((get) => {
    const unsubscribe = queryResult.subscribe(() => {
      get.setSelf(queryResult.runSync());
    });
    get.addFinalizer(unsubscribe);
    return queryResult.runSync();
  });
});

/**
 * Derive a stable identifier from a Queryable. Supports Database (spaceId), Registry (id), and
 * Queue (uri).
 */
const getQueryableIdentifier = (queryable: Database.Queryable): string => {
  if (Database.isDatabase(queryable)) {
    return queryable.spaceId;
  }
  if (Registry.isRegistry(queryable)) {
    return queryable.id;
  }
  // Queue and similar: a URI (EID or DXN) is a stable per-instance identifier.
  if ('uri' in queryable && URI.isURI((queryable as { uri: unknown }).uri)) {
    return (queryable as { uri: URI.URI }).uri;
  }
  if ('id' in queryable && typeof (queryable as { id: unknown }).id === 'string') {
    return (queryable as { id: string }).id;
  }
  throw new Error('Unable to derive identifier from queryable.');
};

/**
 * Memoized query atom for any {@link Database.Queryable} (Database, Queue, Registry).
 *
 * Keyed by queryable identifier + serialized query AST, so the same queryable and query/filter
 * always return the same atom instance — and therefore a single shared subscription. This is the
 * required form inside graph-builder connectors/actions and other atom computes, which re-run on
 * every reactive change: the per-instance `queryResult.atom` getter would open (and leak) a new
 * subscription on each run because `queryable.query(...)` constructs a fresh QueryResult each call.
 *
 * If the queryable is garbage-collected (no longer referenced externally), the returned atom
 * produces an empty array rather than throwing.
 */
export const make = <T extends Entity.Unknown>(
  queryable: Database.Queryable,
  queryOrFilter: Query.Query<T> | Filter.Filter<T>,
): Atom.Atom<T[]> => {
  const identifier = getQueryableIdentifier(queryable);
  // WeakDictionary releases the queryable once nothing else references it.
  queryableRegistry.set(identifier, queryable);

  const normalizedQuery: Query.Any = Query.is(queryOrFilter)
    ? queryOrFilter
    : Query.select(queryOrFilter as Filter.Filter<T>);

  const key = `${identifier}${KEY_SEPARATOR}${stableStringify(normalizedQuery.ast)}`;
  return queryFamily(key) as Atom.Atom<T[]>;
};
