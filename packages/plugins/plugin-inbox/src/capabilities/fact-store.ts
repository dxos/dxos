//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayerSpec } from '@dxos/compute';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { FactStore, type FactStoreApi } from '@dxos/pipeline-rdf';

import { FeedCursors, type FeedCursorsApi, InboxCapabilities } from '#types';

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

  const forSpace = (spaceId: string): FactStoreApi => {
    let store = stores.get(spaceId);
    const hit = store !== undefined;
    if (!store) {
      store = FactStore.makeMemory();
      stores.set(spaceId, store);
    }

    log.info('factStore: forSpace', { spaceId, hit, stores: stores.size });
    return store;
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
    };
  };

  const layerFor = (spaceId: string): Layer.Layer<FactStore> => Layer.succeed(FactStore, forSpace(spaceId));
  const feedCursorsLayerFor = (spaceId: string): Layer.Layer<FeedCursors> =>
    Layer.succeed(FeedCursors, feedCursorsFor(spaceId));
  return { forSpace, layerFor, feedCursorsFor, feedCursorsLayerFor };
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
      Capability.contributes(InboxCapabilities.FactStoreRegistry, registry),
      Capability.contributes(Capabilities.LayerSpec, factStoreSpec),
      Capability.contributes(Capabilities.LayerSpec, feedCursorsSpec),
    ];
  }),
);
