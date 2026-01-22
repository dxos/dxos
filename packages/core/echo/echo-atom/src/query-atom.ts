//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';

import { DXN, Database, type Entity, type Filter, Query, type QueryResult } from '@dxos/echo';

/**
 * Create a self-updating atom from an existing QueryResult.
 * Internally subscribes to queryResult and uses get.setSelf to update.
 * Cleanup is handled via get.addFinalizer.
 *
 * Note: This creates a new atom each time. For memoization, use `make` instead.
 *
 * @param queryResult - The QueryResult to wrap.
 * @returns An atom that automatically updates when query results change.
 */
export const fromQuery = <T extends Entity.Unknown>(queryResult: QueryResult.QueryResult<T>): Atom.Atom<T[]> =>
  Atom.make((get) => {
    // TODO(wittjosiah): Consider subscribing to individual objects here as well, and grabbing their snapshots.
    // Subscribe to QueryResult changes.
    const unsubscribe = queryResult.subscribe(() => {
      get.setSelf(queryResult.results);
    });

    // Register cleanup for when atom is no longer used.
    get.addFinalizer(unsubscribe);

    return queryResult.results;
  });

// Registry: key → Queryable (WeakRef to allow GC).
const queryableRegistry = new Map<string, WeakRef<Database.Queryable>>();

// Atom.family keyed by "identifier:serializedAST".
const queryFamily = Atom.family((key: string) => {
  return Atom.make((get) => {
    // Parse key to extract identifier and AST.
    const separatorIndex = key.indexOf(':');
    const identifier = key.slice(0, separatorIndex);
    const serializedAst = key.slice(separatorIndex + 1);

    // Look up queryable from registry.
    const queryableRef = queryableRegistry.get(identifier);
    const queryable = queryableRef?.deref();
    if (!queryable) {
      return [] as Entity.Unknown[];
    }

    // Deserialize and run query.
    const ast = JSON.parse(serializedAst);
    const queryResult = queryable.query(Query.fromAst(ast)) as QueryResult.QueryResult<Entity.Unknown>;

    const unsubscribe = queryResult.subscribe(() => {
      get.setSelf(queryResult.results);
    });
    get.addFinalizer(unsubscribe);

    return queryResult.results;
  });
});

/**
 * Derive a stable identifier from a Queryable.
 * Supports Database (spaceId), Queue (dxn), and objects with id.
 */
const getQueryableIdentifier = (queryable: Database.Queryable): string => {
  // Database: use spaceId.
  if (Database.isDatabase(queryable)) {
    return queryable.spaceId;
  }
  // Queue or similar: use dxn if it's a DXN instance.
  if ('dxn' in queryable && queryable.dxn instanceof DXN) {
    return queryable.dxn.toString();
  }
  // Fallback: use id if it's a string.
  if ('id' in queryable && typeof queryable.id === 'string') {
    return queryable.id;
  }
  throw new Error('Unable to derive identifier from queryable.');
};

/**
 * Get a memoized query atom for any Queryable (Database, Queue, etc.).
 * Uses a single Atom.family keyed by queryable identifier + serialized query AST.
 * Same queryable + query/filter = same atom instance (proper memoization).
 *
 * @param queryable - The queryable to query (Database, Queue, etc.).
 * @param queryOrFilter - A Query or Filter to execute.
 * @returns A memoized atom that updates when query results change.
 */
export const make = <T extends Entity.Unknown>(
  queryable: Database.Queryable,
  queryOrFilter: Query.Query<T> | Filter.Filter<T>,
): Atom.Atom<T[]> => {
  const identifier = getQueryableIdentifier(queryable);
  return fromQueryable(queryable, identifier, queryOrFilter);
};

/**
 * Internal: Get a memoized query atom for any Queryable with a custom identifier.
 */
const fromQueryable = <T extends Entity.Unknown>(
  queryable: Database.Queryable,
  identifier: string,
  queryOrFilter: Query.Query<T> | Filter.Filter<T>,
): Atom.Atom<T[]> => {
  // Register/update queryable in registry.
  queryableRegistry.set(identifier, new WeakRef(queryable));

  // Normalize to Query.
  const normalizedQuery: Query.Any = Query.is(queryOrFilter)
    ? queryOrFilter
    : Query.select(queryOrFilter as Filter.Filter<T>);

  // Build key: identifier:serializedAST.
  const key = `${identifier}:${JSON.stringify(normalizedQuery.ast)}`;

  return queryFamily(key) as Atom.Atom<T[]>;
};
