//
// Copyright 2025 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Client } from '@dxos/client';
import { type Space, type Type } from '@dxos/client/echo';

/**
 * Subscribe to and retrieve schema changes from a space's schema registry.
 */
export const useSchema = <T extends Type.Obj.Any = Type.Obj.Any>(
  client: Client,
  space: Space | undefined,
  typename: string | undefined,
): T | undefined => {
  const { subscribe, getSchema } = useMemo(() => {
    if (!typename || !space) {
      return {
        subscribe: () => () => {},
        getSchema: () => undefined,
      };
    }

    const staticSchema = client.graph.schemaRegistry.getSchema(typename);
    if (staticSchema) {
      return {
        subscribe: () => () => {},
        getSchema: () => staticSchema,
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

  return useSyncExternalStore(subscribe, getSchema) as T; // TODO(burdon): Remove cast.
};
