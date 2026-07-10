//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayerSpec } from '@dxos/compute';
import { invariant } from '@dxos/invariant';
import { FactStore, type FactStoreApi, FeedCursors, type FeedCursorsApi } from '@dxos/pipeline-rdf';

import { BrainCapabilities } from '#types';

/**
 * Per-space in-memory registry: one shared {@link FactStore} plus per-feed processing cursors, used
 * as both the operation-injected services and the surface-read store. Facts and cursors live in the
 * same registry so they share the session lifetime (both reset together on reload).
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
  /** The per-feed processing cursors for a space (created on first use). */
  feedCursorsFor: (spaceId: string) => FeedCursorsApi;
  /** A Layer providing `FeedCursors` for a space, wrapping the same instance `feedCursorsFor` returns. */
  feedCursorsLayerFor: (spaceId: string) => Layer.Layer<FeedCursors>;
};

/**
 * Creates a registry that lazily builds one shared in-memory FactStore + per-feed cursor map per
 * space. The store and feed-cursor pairs return the same instance for a given space, so an
 * operation's injected services and a surface's read store observe identical state.
 */
export const makeFactStoreRegistry = (): FactStoreRegistry => {
  const stores = new Map<string, FactStoreApi>();
  const cursorsBySpace = new Map<string, Map<string, number>>();
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

  const feedCursorsFor = (spaceId: string): FeedCursorsApi => {
    let cursors = cursorsBySpace.get(spaceId);
    if (!cursors) {
      cursors = new Map();
      cursorsBySpace.set(spaceId, cursors);
    }

    const map = cursors;
    return {
      get: (feedId) => map.get(feedId) ?? 0,
      advance: (feedId, key) => void map.set(feedId, Math.max(map.get(feedId) ?? 0, key)),
      reset: (feedId) => void map.delete(feedId),
    };
  };

  const layerFor = (spaceId: string): Layer.Layer<FactStore> => Layer.succeed(FactStore, forSpace(spaceId));
  const feedCursorsLayerFor = (spaceId: string): Layer.Layer<FeedCursors> =>
    Layer.succeed(FeedCursors, feedCursorsFor(spaceId));
  return { forSpace, layerFor, subscribe, feedCursorsFor, feedCursorsLayerFor };
};

/**
 * Contributes a single shared {@link FactStoreRegistry} plus space-affinity {@link LayerSpec}s that
 * provide `FactStore` and `FeedCursors` to operations. All close over the SAME registry, so the
 * operation-injected store and the capability-read store resolve to the same per-space instance.
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

    const feedCursorsSpec = LayerSpec.make(
      {
        affinity: 'space',
        requires: [],
        provides: [FeedCursors],
      },
      (context) => {
        invariant(context.space, 'space context required for FeedCursors layer');
        return registry.feedCursorsLayerFor(context.space);
      },
    );

    return [
      Capability.contributes(BrainCapabilities.FactStoreRegistry, registry),
      Capability.contributes(Capabilities.LayerSpec, factStoreSpec),
      Capability.contributes(Capabilities.LayerSpec, feedCursorsSpec),
    ];
  }),
);
