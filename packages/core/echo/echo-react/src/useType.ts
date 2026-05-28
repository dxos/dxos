//
// Copyright 2025 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Database, Type } from '@dxos/echo';

/**
 * Subscribe to and retrieve type changes from a space's schema registry.
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

    let currentType = db.graph.registry
      .list()
      .filter(Type.isType)
      .find((t) => Type.getTypename(t) === typename) as T | undefined;

    return {
      subscribe: (onStoreChange: () => void) => {
        const unsubscribe = db.graph.registry.changed.on(() => {
          currentType = db.graph.registry
            .list()
            .filter(Type.isType)
            .find((t) => Type.getTypename(t) === typename) as T | undefined;
          onStoreChange();
        });

        return unsubscribe;
      },
      getType: (): T | undefined => currentType,
    };
  }, [typename, db]);

  return useSyncExternalStore(subscribe, getType);
};
