//
// Copyright 2025 DXOS.org
//

import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';

import { type Database, Filter, Query, Scope, Type } from '@dxos/echo';

type MaybeAccessor<T> = T | Accessor<T>;

/**
 * Subscribe to and retrieve a type by typename from a space.
 * Accepts either values or accessors for db and typename.
 *
 * Fans across the owning space db (persisted custom types) and the shared
 * registry (static/runtime plugin types). Persisted types live only in the db,
 * so a registry-only lookup misses them.
 *
 * @param db - The database instance (can be reactive)
 * @param typename - The typename to query (can be reactive)
 * @returns An accessor that returns the current type or undefined
 */
export const useType = (
  db?: MaybeAccessor<Database.Database | undefined>,
  typename?: MaybeAccessor<string | undefined>,
): Accessor<Type.AnyEntity | undefined> => {
  // Derive resolved values reactively.
  const resolved = createMemo(() => {
    const resolvedDb = typeof db === 'function' ? db() : db;
    const resolvedTypename = typeof typename === 'function' ? typename() : typename;
    if (!resolvedTypename || !resolvedDb) {
      return undefined;
    }
    return { db: resolvedDb, typename: resolvedTypename };
  });

  // Store the current type in a signal.
  const [type, setType] = createSignal<Type.AnyEntity | undefined>(undefined);

  // Subscribe to registry changes.
  createEffect(() => {
    const r = resolved();
    if (!r) {
      // Keep previous value during transitions to prevent flickering.
      return;
    }

    const { db: resolvedDb, typename: resolvedTypename } = r;

    const queryResult = resolvedDb.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()));
    const update = () => setType(() => queryResult.results.find((type) => Type.getTypename(type) === resolvedTypename));

    // Subscribe before reading `.results` — the query requires at least one subscriber.
    const unsubscribe = queryResult.subscribe(update);
    update();

    onCleanup(unsubscribe);
  });

  return type;
};
