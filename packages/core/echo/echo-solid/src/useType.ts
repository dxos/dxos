//
// Copyright 2025 DXOS.org
//

import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';

import { type Database, type Type } from '@dxos/echo';

type MaybeAccessor<T> = T | Accessor<T>;

/**
 * Subscribe to and retrieve type changes from a database's schema registry.
 * Accepts either values or accessors for db and typename.
 *
 * @param db - The database instance (can be reactive)
 * @param typename - The typename to query (can be reactive)
 * @returns An accessor that returns the current type or undefined
 */
export const useType = (
  db?: MaybeAccessor<Database.Database | undefined>,
  typename?: MaybeAccessor<string | undefined>,
): Accessor<Type.Type | undefined> => {
  // Derive the type query reactively
  const query = createMemo(() => {
    const resolvedDb = typeof db === 'function' ? db() : db;
    const resolvedTypename = typeof typename === 'function' ? typename() : typename;
    if (!resolvedTypename || !resolvedDb) {
      return undefined;
    }
    return resolvedDb.schemaRegistry.query({ typename: resolvedTypename, location: ['database', 'runtime'] });
  });

  // Store the current type in a signal
  const [type, setType] = createSignal<Type.Type | undefined>(undefined);

  // Subscribe to query changes
  createEffect(() => {
    const q = query();
    if (!q) {
      // Keep previous value during transitions to prevent flickering
      return;
    }

    // Subscribe to updates with immediate fire to get initial result and track changes
    // The subscription will automatically start the reactive query
    const unsubscribe = q.subscribe(
      () => {
        // Access results inside the callback to ensure query is running
        const results = q.results;
        setType(() => results[0]);
      },
      { fire: true },
    );

    onCleanup(unsubscribe);
  });

  return type;
};
