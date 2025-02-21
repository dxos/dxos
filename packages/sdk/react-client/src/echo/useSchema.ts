//
// Copyright 2025 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Space } from '@dxos/client/echo';
import { type EchoSchema } from '@dxos/echo-schema';

/**
 * Subscribe to and retrieve schema changes from a space's schema registry.
 * @param space - The containing space from which to fetch schema data.
 * @param typename - The specific type name to query from the schema registry.
 * @returns The current schema for the given type, or undefined if space/typename unavailable.
 */
export const useSchema = (space: Space | undefined, typename: string | undefined): EchoSchema | undefined => {
  const { subscribe, getSchema } = useMemo(() => {
    if (!typename || !space) {
      return {
        subscribe: () => () => {},
        getSchema: () => undefined,
      };
    }

    const query = space.db.schemaRegistry.query({ typename });
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
  }, [typename, space]);

  return useSyncExternalStore(subscribe, getSchema);
};
