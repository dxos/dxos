//
// Copyright 2025 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Database, Type } from '@dxos/echo';

/**
 * Subscribe to and retrieve schema changes from a space's schema registry.
 * @deprecated Use `useType` instead.
 */
export const useSchema = (db?: Database.Database, typename?: string): Type.Type | undefined => {
  const { subscribe, getSchema } = useMemo(() => {
    if (!typename || !db) {
      return {
        subscribe: () => () => {},
        getSchema: (): Type.Type | undefined => undefined,
      };
    }

    let currentSchema = db.graph.registry.types.find((t) => Type.getTypename(t) === typename) as Type.Type | undefined;

    return {
      subscribe: (onStoreChange: () => void) => {
        const unsubscribe = db.graph.registry.changed.on(() => {
          currentSchema = db.graph.registry.types.find((t) => Type.getTypename(t) === typename) as
            | Type.Type
            | undefined;
          onStoreChange();
        });

        return unsubscribe;
      },
      getSchema: () => currentSchema,
    };
  }, [typename, db]);

  return useSyncExternalStore(subscribe, getSchema);
};

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

    let currentType = db.graph.registry.types.find((t) => Type.getTypename(t) === typename) as T | undefined;

    return {
      subscribe: (onStoreChange: () => void) => {
        const unsubscribe = db.graph.registry.changed.on(() => {
          currentType = db.graph.registry.types.find((t) => Type.getTypename(t) === typename) as T | undefined;
          onStoreChange();
        });

        return unsubscribe;
      },
      getType: (): T | undefined => currentType,
    };
  }, [typename, db]);

  return useSyncExternalStore(subscribe, getType);
};
