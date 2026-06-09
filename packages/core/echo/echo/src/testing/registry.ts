//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';

import { Event } from '@dxos/async';

import * as Registry from '../Registry';

/**
 * Noop `Registry.Service` layer for testing — always returns empty query results.
 * Use this in test layer stacks that require `Registry.Service` but don't need
 * actual registry contents.
 */
export const registryLayerNoop: Layer.Layer<Registry.Service> = Layer.succeed(
  Registry.Service,
  {
    [Registry.TypeId]: Registry.TypeId,
    id: 'noop-registry',
    changed: new Event<void>(),
    local: [],
    add: () => {},
    remove: () => false,
    clear: () => {},
    get: () => undefined,
    getByURI: () => undefined,
    list: () => [],
    // QueryFn is an overloaded interface — a single generic function cannot satisfy both overload
    // signatures without a cast. This is the intentional type-system boundary.
    query: ((_queryOrFilter: unknown) => ({
      results: [],
      entries: [],
      run: async () => [],
      runEntries: async () => [],
      runSync: () => [],
      runSyncEntries: () => [],
      first: async (): Promise<never> => {
        throw new Error('registryLayerNoop: registry is empty');
      },
      firstOrUndefined: async () => undefined,
      subscribe: () => () => {},
    })) as Registry.Registry['query'],
  } satisfies Registry.Registry,
);
