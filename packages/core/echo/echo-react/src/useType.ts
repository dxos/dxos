//
// Copyright 2025 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Database, Filter, Query, Scope, Type } from '@dxos/echo';

/**
 * Subscribe to and retrieve a type by typename from a space.
 *
 * Fans across the owning space db (persisted custom types) and the shared
 * registry (static/runtime plugin types). Persisted types live only in the db,
 * so a registry-only lookup misses them.
 */
export const useType = <T extends Type.AnyEntity = Type.AnyEntity>(
  db?: Database.Database,
  typename?: string,
): T | undefined => {
  const { subscribe, getType } = useMemo(() => {
    if (!typename || !db) {
      return {
        subscribe: () => () => {},
        getType: (): T | undefined => undefined,
      };
    }

    const queryResult = db.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()));
    let subscribed = false;
    const find = (): T | undefined =>
      subscribed
        ? (queryResult.results.find((type) => Type.getTypename(type) === typename) as T | undefined)
        : undefined;

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
  }, [typename, db]);

  return useSyncExternalStore(subscribe, getType);
};
