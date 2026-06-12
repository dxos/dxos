//
// Copyright 2025 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Database, Filter, Query, Scope, Type } from '@dxos/echo';

/**
 * Subscribe to and retrieve a type by its URI from a space: a static schema's typename DXN, or a
 * persisted (database) schema's `echo:` EID (what `Type.getURI` / `getTypeURIFromQuery` produce).
 *
 * Fans across the owning space db (persisted custom types) and the shared
 * registry (static/runtime plugin types). Persisted types live only in the db,
 * so a registry-only lookup misses them.
 */
export const useType = <T extends Type.AnyEntity = Type.AnyEntity>(
  db?: Database.Database,
  typeUri?: string,
): T | undefined => {
  const { subscribe, getType } = useMemo(() => {
    if (!typeUri || !db) {
      return {
        subscribe: () => () => {},
        getType: (): T | undefined => undefined,
      };
    }

    const queryResult = db.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()));
    let subscribed = false;
    const find = (): T | undefined =>
      subscribed ? (queryResult.results.find((type) => Type.getURI(type) === typeUri) as T | undefined) : undefined;

    return {
      subscribe: (onStoreChange: () => void) => {
        subscribed = true;
        const unsubscribe = queryResult.subscribe(onStoreChange);
        return () => {
          unsubscribe();
          subscribed = false;
        };
      },
      getType: find,
    };
  }, [typeUri, db]);

  return useSyncExternalStore(subscribe, getType);
};
