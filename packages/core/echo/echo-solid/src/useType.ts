//
// Copyright 2025 DXOS.org
//

import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';

import { DXN, type Database, Filter, Query, Scope, Type } from '@dxos/echo';

type MaybeAccessor<T> = T | Accessor<T>;

/**
 * Subscribe to and retrieve a type by its URI from a space: a static schema's typename DXN, or a
 * persisted (database) schema's `echo:` EID (what `Type.getURI` / `getTypeURIFromQuery` produce).
 * Accepts either values or accessors for db and typeUri.
 *
 * Fans across the owning space db (persisted custom types) and the shared
 * registry (static/runtime plugin types). Persisted types live only in the db,
 * so a registry-only lookup misses them.
 *
 * @param db - The database instance (can be reactive)
 * @param typeUri - The type URI to query (can be reactive)
 * @returns An accessor that returns the current type or undefined
 */
export const useType = (
  db?: MaybeAccessor<Database.Database | undefined>,
  typeUri?: MaybeAccessor<string | undefined>,
): Accessor<Type.AnyEntity | undefined> => {
  // Derive resolved values reactively.
  const resolved = createMemo(() => {
    const resolvedDb = typeof db === 'function' ? db() : db;
    const resolvedTypeUri = typeof typeUri === 'function' ? typeUri() : typeUri;
    if (!resolvedTypeUri || !resolvedDb) {
      return undefined;
    }
    return { db: resolvedDb, typeUri: resolvedTypeUri };
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

    const { db: resolvedDb, typeUri: resolvedTypeUri } = r;

    const searchDxn = DXN.isDXN(resolvedTypeUri) ? DXN.tryMake(resolvedTypeUri) : undefined;
    const queryResult = resolvedDb.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()));
    const update = () =>
      setType(() =>
        queryResult.results.find((type) => {
          const uri = Type.getURI(type);
          if (uri === resolvedTypeUri) return true;
          if (searchDxn && DXN.isDXN(uri)) {
            const typeDxn = DXN.tryMake(uri);
            return typeDxn != null && DXN.getName(typeDxn) === DXN.getName(searchDxn);
          }
          return false;
        }),
      );

    // Subscribe before reading `.results` — the query requires at least one subscriber.
    const unsubscribe = queryResult.subscribe(update);
    update();

    onCleanup(unsubscribe);
  });

  return type;
};
