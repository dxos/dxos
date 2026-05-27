//
// Copyright 2025 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Database, type Type } from '@dxos/echo';

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

    const query = db.schemaRegistry.query({ typename, location: ['database', 'runtime'] });
    let currentType = query.runSync()[0] as T | undefined;

    return {
      subscribe: (onStoreChange: () => void) => {
        const unsubscribe = query.subscribe(() => {
          currentType = query.results[0] as T | undefined;
          onStoreChange();
        });

        return unsubscribe;
      },
      getType: (): T | undefined => currentType,
    };
  }, [typename, db]);

  return useSyncExternalStore(subscribe, getType);
};
