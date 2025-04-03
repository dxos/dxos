//
// Copyright 2025 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { ReadonlySchema, type ImmutableSchema } from '@dxos/echo-schema';

// TODO(burdon): Factor out with better type checking.
// TODO(burdon): Ensure static and dynamic schema do not have overlapping type names.
export const getSchemaByTypename = async (
  client: Client,
  space: Space,
  typename: string,
): Promise<ImmutableSchema | undefined> => {
  const schema = client.graph.schemaRegistry.getSchema(typename);
  if (schema) {
    return new ReadonlySchema(schema);
  }

  return await space.db.schemaRegistry.query({ typename }).firstOrUndefined();
};

/**
 * Subscribe to and retrieve schema changes from a space's schema registry.
 */
export const useSchema = (
  client: Client,
  space: Space | undefined,
  typename: string | undefined,
): ImmutableSchema | undefined => {
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
        getSchema: () => new ReadonlySchema(staticSchema),
      };
    }

    const query = space.db.schemaRegistry.query({ typename });
    const initialResult = query.runSync()[0];
    let currentSchema = initialResult as ImmutableSchema;

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
