//
// Copyright 2025 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Database, type Type } from '@dxos/echo';

/**
 * Subscribe to and retrieve schema changes from a space's schema registry.
 */
export const useSchema = <T extends Type.Entity.Any = Type.Entity.Any>(
  db?: Database.Database,
  typename?: string,
): T | undefined => {
  const { subscribe, getSchema } = useMemo(() => {
    if (!typename || !db) {
      return {
        subscribe: () => () => {},
        getSchema: () => undefined,
      };
    }

    const query = db.schemaRegistry.query({ typename, location: ['database', 'runtime'] });
    const initialResult = query.runSync()[0];
    let currentSchema = initialResult;

    return {
      subscribe: (onStoreChange: () => void) => {
        const unsubscribe = query.subscribe(() => {
          currentSchema = query.results[0];
          onStoreChange();
        });

        return unsubscribe;
      },
      getSchema: () => currentSchema,
    };
  }, [typename, db]);

  return useSyncExternalStore(subscribe, getSchema) as T;
};
