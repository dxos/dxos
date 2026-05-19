//
// Copyright 2025 DXOS.org
//

import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';

import { type Database, Type } from '@dxos/echo';
import { runSyncAndForwardErrors } from '@dxos/effect';

type MaybeAccessor<T> = T | Accessor<T>;

/**
 * Subscribe to and retrieve schema changes from a database's schema registry.
 * Accepts either values or accessors for db and typename.
 *
 * @param db - The database instance (can be reactive)
 * @param typename - The schema typename to query (can be reactive)
 * @returns An accessor that returns the current schema or undefined
 */
export const useSchema = (
  db?: MaybeAccessor<Database.Database | undefined>,
  typename?: MaybeAccessor<string | undefined>,
): Accessor<T | undefined> => {
  // Derive resolved values reactively.
  const resolved = createMemo(() => {
    const resolvedDb = typeof db === 'function' ? db() : db;
    const resolvedTypename = typeof typename === 'function' ? typename() : typename;
    if (!resolvedTypename || !resolvedDb) {
      return undefined;
    }
    return { db: resolvedDb, typename: resolvedTypename };
  });

  // Store the current schema in a signal.
  const [schema, setSchema] = createSignal<T | undefined>(undefined);

  // Subscribe to registry changes.
  createEffect(() => {
    const r = resolved();
    if (!r) {
      // Keep previous value during transitions to prevent flickering.
      return;
    }

    const { db: resolvedDb, typename: resolvedTypename } = r;

    // Set initial value immediately.
    setSchema(
      () => runSyncAndForwardErrors(resolvedDb.graph.registry.listTypes()).find((t) => Type.getTypename(t) === resolvedTypename) as T | undefined,
    );

    const unsubscribe = resolvedDb.graph.registry.changed.on(() => {
      setSchema(
        () => runSyncAndForwardErrors(resolvedDb.graph.registry.listTypes()).find((t) => Type.getTypename(t) === resolvedTypename) as T | undefined,
      );
    });

    onCleanup(unsubscribe);
  });

  return schema;
};
