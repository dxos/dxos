//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayerSpec } from '@dxos/compute';
import { invariant } from '@dxos/invariant';
import { FactStore, type FactStoreApi } from '@dxos/pipeline-rdf';

import { InboxCapabilities } from '#types';

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

/**
 * Contributes a single shared {@link FactStoreRegistry} plus a space-affinity {@link LayerSpec} that
 * provides `FactStore` to operations. Both close over the SAME registry, so the operation-injected
 * store and the capability-read store resolve to the same per-space instance.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = makeFactStoreRegistry();

    const factStoreSpec = LayerSpec.make(
      {
        affinity: 'space',
        requires: [],
        provides: [FactStore],
      },
      (context) => {
        invariant(context.space, 'space context required for FactStore layer');
        return registry.layerFor(context.space);
      },
    );

    return [
      Capability.contributes(InboxCapabilities.FactStoreRegistry, registry),
      Capability.contributes(Capabilities.LayerSpec, factStoreSpec),
    ];
  }),
);
