//
// Copyright 2025 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Database, type Type } from '@dxos/echo';

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

    const query = db.schemaRegistry.query({ typename, location: ['database', 'runtime'] });
    let currentSchema: Type.Type | undefined = query.runSync()[0];

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

  return useSyncExternalStore(subscribe, getSchema);
};
