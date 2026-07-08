//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';

import { FactStore, type FactStoreApi } from '@dxos/pipeline-rdf';

/**
 * Per-space in-memory FactStore registry: one shared instance per space, used as both the
 * operation-injected service and the surface-read store.
 */
export type FactStoreRegistry = {
  /** The singleton in-memory FactStore for a space (created on first use). */
  forSpace: (spaceId: string) => FactStoreApi;
  /** A Layer providing `FactStore` for a space, wrapping the same instance `forSpace` returns. */
  layerFor: (spaceId: string) => Layer.Layer<FactStore>;
};

/**
 * Creates a registry that lazily builds one shared in-memory FactStore per space. `layerFor` and
 * `forSpace` return the same instance for a given space, so an operation's injected service and a
 * surface's read store observe identical facts.
 */
export const makeFactStoreRegistry = (): FactStoreRegistry => {
  const stores = new Map<string, FactStoreApi>();
  const forSpace = (spaceId: string): FactStoreApi => {
    let store = stores.get(spaceId);
    if (!store) {
      store = FactStore.makeMemory();
      stores.set(spaceId, store);
    }
    return store;
  };
  const layerFor = (spaceId: string): Layer.Layer<FactStore> => Layer.succeed(FactStore, forSpace(spaceId));
  return { forSpace, layerFor };
};
