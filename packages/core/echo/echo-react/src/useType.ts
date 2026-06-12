//
// Copyright 2025 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Database, Filter, Query, Scope, Type } from '@dxos/echo';

/**
 * Subscribe to and retrieve a type by its tag from a space: a static schema's typename, or a
 * persisted (database) schema's entity id (the tag {@link getTypeTag} / `getTypenameFromQuery`
 * produce — persisted-type objects carry the schema's echo id, not a typename).
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
        ? (queryResult.results.find(
            (type) =>
              Type.getTypename(type) === typename ||
              type.id === typename ||
              // Space-qualified form: spaceId:entityId — strip the qualifier and compare.
              (typename.length > type.id.length && typename.endsWith(`:${type.id}`)),
          ) as T | undefined)
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
