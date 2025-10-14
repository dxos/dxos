//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import { useMemo, useSyncExternalStore } from 'react';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { type BaseSchema } from '@dxos/echo-schema';

/**
 * Subscribe to and retrieve schema changes from a space's schema registry.
 */
export const useSchema = (
  client: Client,
  space: Space | undefined,
  typename: string | undefined,
): Schema.Schema.AnyNoContext | undefined => {
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
    const initialResult: BaseSchema = query.runSync()[0];
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
