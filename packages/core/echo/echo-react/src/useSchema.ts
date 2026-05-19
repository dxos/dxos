//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useMemo, useSyncExternalStore } from 'react';

import { type Database, Type } from '@dxos/echo';

/**
 * Subscribe to and retrieve schema changes from a space's schema registry.
 */
export const useSchema = (db?: Database.Database, typename?: string): Type.Type | undefined => {
  const { subscribe, getSchema } = useMemo(() => {
    if (!typename || !db) {
      return {
        subscribe: () => () => {},
        getSchema: (): Type.Type | undefined => undefined,
      };
    }

    let currentSchema = Effect.runSync(db.graph.registry.listTypes()).find((t) => Type.getTypename(t) === typename) as T | undefined;

    return {
      subscribe: (onStoreChange: () => void) => {
        const unsubscribe = db.graph.registry.changed.on(() => {
          currentSchema = Effect.runSync(db.graph.registry.listTypes()).find((t) => Type.getTypename(t) === typename) as T | undefined;
          onStoreChange();
        });

        return unsubscribe;
      },
      getSchema: () => currentSchema,
    };
  }, [typename, db]);

  return useSyncExternalStore(subscribe, getSchema);
};
