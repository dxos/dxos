//
// Copyright 2025 DXOS.org
//

import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';

import { type Database, Type } from '@dxos/echo';

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
): Accessor<Type.AnyEntity | undefined> => {
  // Derive resolved values reactively.
  const resolved = createMemo(() => {
    const resolvedDb = typeof db === 'function' ? db() : db;
    const resolvedTypename = typeof typename === 'function' ? typename() : typename;
    if (!resolvedTypename || !resolvedDb) {
      return undefined;
    }
    return { db: resolvedDb, typename: resolvedTypename };
  });

  // Store the current type in a signal.
  const [type, setType] = createSignal<Type.AnyEntity | undefined>(undefined);

  // Subscribe to registry changes.
  createEffect(() => {
    const r = resolved();
    if (!r) {
      // Keep previous value during transitions to prevent flickering.
      return;
    }

    const { db: resolvedDb, typename: resolvedTypename } = r;

    // Set initial value immediately.
    setType(() =>
      resolvedDb.graph.registry
        .list()
        .filter(Type.isType)
        .find((t) => Type.getTypename(t) === resolvedTypename),
    );

    const unsubscribe = resolvedDb.graph.registry.changed.on(() => {
      setType(() =>
        resolvedDb.graph.registry
          .list()
          .filter(Type.isType)
          .find((t) => Type.getTypename(t) === resolvedTypename),
      );
    });

    onCleanup(unsubscribe);
  });

  return type;
};
