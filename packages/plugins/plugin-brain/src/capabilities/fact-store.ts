//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayerSpec } from '@dxos/compute';
import { invariant } from '@dxos/invariant';
import { FactStore, type FactStoreApi } from '@dxos/pipeline-rdf';

import { BrainCapabilities } from '#types';

/**
 * Per-space in-memory registry: the shared {@link FactStore}, used as both the operation-injected
 * service and the surface-read store. Per-feed processing progress no longer lives here — it's a
 * persisted `Cursor` (`@dxos/link`), found/created directly by the operation that drives the fact
 * pipeline (e.g. `AnalyzeMailbox`), so it survives a reload independently of this in-memory store.
 */
export type FactStoreRegistry = {
  /** The singleton in-memory FactStore for a space (created on first use). */
  forSpace: (spaceId: string) => FactStoreApi;
  /** A Layer providing `FactStore` for a space, wrapping the same instance `forSpace` returns. */
  layerFor: (spaceId: string) => Layer.Layer<FactStore>;
  /**
   * Subscribe to fact mutations for a space; the listener fires after any `putFacts`/`clear` on that
   * space's store. Returns an unsubscribe. The in-memory FactStore is not otherwise observable, so
   * this is how surfaces re-query when the analysis pipeline (or a reset) mutates the store.
   */
  subscribe: (spaceId: string, listener: () => void) => () => void;
};

/**
 * Creates a registry that lazily builds one shared in-memory FactStore per space, so an operation's
 * injected service and a surface's read store observe identical state.
 */
export const makeFactStoreRegistry = (): FactStoreRegistry => {
  const stores = new Map<string, FactStoreApi>();
  const listenersBySpace = new Map<string, Set<() => void>>();

  const notify = (spaceId: string): void => listenersBySpace.get(spaceId)?.forEach((listener) => listener());

  // Wraps a store so mutating operations notify subscribers after they succeed; the in-memory
  // FactStore has no change channel of its own, so this is the only observability surfaces get.
  const withNotify = (store: FactStoreApi, spaceId: string): FactStoreApi => ({
    ...store,
    putFacts: (facts) => store.putFacts(facts).pipe(Effect.tap(() => Effect.sync(() => notify(spaceId)))),
    clear: () => store.clear().pipe(Effect.tap(() => Effect.sync(() => notify(spaceId)))),
  });

  const forSpace = (spaceId: string): FactStoreApi => {
    let store = stores.get(spaceId);
    if (!store) {
      store = withNotify(FactStore.makeMemory(), spaceId);
      stores.set(spaceId, store);
    }

    return store;
  };

  const subscribe: FactStoreRegistry['subscribe'] = (spaceId, listener) => {
    let listeners = listenersBySpace.get(spaceId);
    if (!listeners) {
      listeners = new Set();
      listenersBySpace.set(spaceId, listeners);
    }

    listeners.add(listener);
    return () => void listeners.delete(listener);
  };

  const layerFor = (spaceId: string): Layer.Layer<FactStore> => Layer.succeed(FactStore, forSpace(spaceId));
  return { forSpace, layerFor, subscribe };
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
      Capability.provide(BrainCapabilities.FactStoreRegistry, registry),
      Capability.provide(Capabilities.LayerSpec, factStoreSpec),
    ];
  }),
);
