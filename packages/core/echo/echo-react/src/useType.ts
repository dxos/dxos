//
// Copyright 2025 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Database, DXN, EID, Filter, Query, Scope, Type, URI } from '@dxos/echo';

/**
 * Subscribe to and retrieve a type by its URI from a space: a static schema's typename DXN, or a
 * persisted (database) schema's `echo:` EID (what `Type.getURI` / `getTypeURIFromQuery` produce).
 *
 * Fans across the owning space db (persisted custom types) and the shared
 * registry (static/runtime plugin types). Persisted types live only in the db,
 * so a registry-only lookup misses them.
 *
 * DXN matching is version-agnostic: `dxn:com.example/Foo` matches `dxn:com.example/Foo:0.1.0`.
 * This lets callers pass a bare typename DXN (no version) from e.g. a `ReferenceAnnotation`.
 */
export const useType = <T extends Type.AnyEntity = Type.AnyEntity>(
  db?: Database.Database,
  typeUri?: URI.URI,
): T | undefined => {
  const { subscribe, getType } = useMemo(() => {
    if (!typeUri || !db) {
      return {
        subscribe: () => () => {},
        getType: (): T | undefined => undefined,
      };
    }

    const searchEid = EID.isEID(typeUri) ? EID.tryParse(typeUri) : undefined;
    const searchDxn = DXN.isDXN(typeUri) ? DXN.tryMake(typeUri) : undefined;

    const queryResult = db.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()));
    let subscribed = false;
    const find = (): T | undefined => {
      if (!subscribed) {
        return undefined;
      }
      return queryResult.results.find((type) => {
        const uri = Type.getURI(type);
        if (uri === typeUri) {
          return true;
        }
        // EID matching is space-agnostic: echo:/<id> matches echo://<space>/<id>.
        if (searchEid && EID.isEID(uri)) {
          const typeEid = EID.tryParse(uri);
          return typeEid != null && EID.getEntityId(typeEid) === EID.getEntityId(searchEid);
        }
        // DXN matching is version-agnostic so callers may pass an unversioned DXN.
        if (searchDxn && DXN.isDXN(uri)) {
          const typeDxn = DXN.tryMake(uri);
          return typeDxn != null && DXN.getName(typeDxn) === DXN.getName(searchDxn);
        }
        return false;
      }) as T | undefined;
    };

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
