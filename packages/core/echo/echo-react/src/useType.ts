//
// Copyright 2025 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Database, type Type } from '@dxos/echo';

/**
 * Subscribe to and retrieve type changes from a space's schema registry.
 */
export const useType = (db?: Database.Database, typename?: string): Type.Type | undefined => {
  const { subscribe, getType } = useMemo(() => {
    if (!typename || !db) {
      return {
        subscribe: () => () => {},
        getType: (): Type.Type | undefined => undefined,
      };
    }

    const query = db.schemaRegistry.query({ typename, location: ['database', 'runtime'] });
    let currentType: Type.Type | undefined = query.runSync()[0];

    return {
      subscribe: (onStoreChange: () => void) => {
        const unsubscribe = query.subscribe(() => {
          currentType = query.results[0];
          onStoreChange();
        });

        return unsubscribe;
      },
      getType: () => currentType,
    };
  }, [typename, db]);

  return useSyncExternalStore(subscribe, getType);
};
