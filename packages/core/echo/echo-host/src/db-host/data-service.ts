//
// Copyright 2021 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { UpdateScheduler } from '@dxos/async';
import type * as Host from '@dxos/automerge-proxy/Host';
import * as Wire from '@dxos/automerge-proxy/Wire';
import { Context } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { toServiceError } from '@dxos/protocols';
import { type DataService } from '@dxos/protocols/rpc';

import { type AutomergeHost, type DocumentLease, deriveCollectionIdFromSpaceId } from '../automerge/index.ts';
import { DocumentsSynchronizer } from './documents-synchronizer.ts';
import { type SpaceStateManager } from './space-state-manager.ts';

/** Builds the RawStrings the wire tags, since the proxy package does not run Automerge. */
const WIRE: Wire.DecodeOptions = { rawString: (text) => new A.RawString(text) };

export type DataServiceProps = {
  automergeHost: AutomergeHost;
  /** Serves clients that keep proxies of documents instead of Automerge replicas; without it they are refused. */
  proxyHost?: Host.DocumentHost;
  spaceStateManager: SpaceStateManager;
  updateIndexes: (request: DataService.UpdateIndexesRequest) => Promise<void>;
  getSpaceStats: (spaceId: SpaceId) => Promise<DataService.DatabaseStats>;
  runGarbageCollection: (
    spaceId: SpaceId,
    options: DataService.RunGarbageCollectionRequest,
  ) => Promise<DataService.GarbageCollectionReport>;
};

/**
 * Data sync between client and services.
 */
// TODO(burdon): Move to client-services.
export class DataServiceImpl implements DataService.Handlers {
  /**
   * Map of subscriptions.
   * subscriptionId -> DocumentsSynchronizer
   */
  private readonly '_subscriptions' = new Map<string, DocumentsSynchronizer>();

  /**
   * Leases on documents created for a client that has not subscribed to them yet. A created document
   * lives only in memory until it is saved, and its creator subscribes in a later call, so releasing
   * it at creation lets the host evict it out from under the write that follows.
   */
  private readonly '_pendingCreations' = new Map<string, DocumentLease>();

  private readonly '_automergeHost': AutomergeHost;
  readonly #proxyHost: Host.DocumentHost | undefined;
  /** Open proxy subscriptions, which count with {@link _subscriptions} toward the last client leaving. */
  readonly #proxySubscriptions = new Set<string>();
  private readonly '_spaceStateManager': SpaceStateManager;
  private readonly '_updateIndexes': (request: DataService.UpdateIndexesRequest) => Promise<void>;
  private readonly '_getSpaceStats': (spaceId: SpaceId) => Promise<DataService.DatabaseStats>;
  private readonly '_runGarbageCollection': (
    spaceId: SpaceId,
    options: DataService.RunGarbageCollectionRequest,
  ) => Promise<DataService.GarbageCollectionReport>;

  'constructor'(params: DataServiceProps) {
    this._automergeHost = params.automergeHost;
    this.#proxyHost = params.proxyHost;
    this._spaceStateManager = params.spaceStateManager;
    this._updateIndexes = params.updateIndexes;
    this._getSpaceStats = params.getSpaceStats;
    this._runGarbageCollection = params.runGarbageCollection;
  }

  ['DataService.subscribe'](
    request: DataService.SubscribeRequest,
  ): EffectStream.Stream<DataService.BatchedDocumentUpdates, Error> {
    return EffectEx.streamFromEmitter<DataService.BatchedDocumentUpdates, Error>((emit) => {
      const synchronizer = new DocumentsSynchronizer({
        automergeHost: this._automergeHost,
        sendUpdates: (updates) => void emit.single(updates),
      });
      synchronizer
        .open()
        .then(() => {
          this._subscriptions.set(request.subscriptionId, synchronizer);
          // Ready beacon: an empty update batch signals that the subscription is registered, so the
          // client can safely issue `updateSubscription` (see RepoProxy reconnect). A real update
          // never carries an empty batch, so this is unambiguous and a no-op on the client.
          void emit.single({ updates: [] });
        })
        .catch((err) => {
          log.catch(err);
          void emit.fail(err);
        });
      return Effect.sync(() => {
        // Guarded by identity: a reconnect re-subscribes under the same id before this finalizer
        // runs, and an unconditional delete would drop the replacement.
        if (this._subscriptions.get(request.subscriptionId) === synchronizer) {
          this._subscriptions.delete(request.subscriptionId);
        }
        this.#releaseCreationsIfNoClients();
        void synchronizer.close();
      });
    });
  }

  ['DataService.updateSubscription'](request: DataService.UpdateSubscriptionRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        const synchronizer = this._subscriptions.get(request.subscriptionId);
        invariant(synchronizer, 'Subscription not found');

        if (request.addIds?.length) {
          await synchronizer.addDocuments(request.addIds as DocumentId[]);
          // The subscription now holds each document, so the creation lease has nothing left to guard.
          this.#releaseCreations(request.addIds);
        }
        if (request.removeIds?.length) {
          await synchronizer.removeDocuments(request.removeIds as DocumentId[]);
        }
      },
      catch: toServiceError,
    });
  }

  ['DataService.createDocument'](
    request: DataService.CreateDocumentRequest,
  ): Effect.Effect<DataService.CreateDocumentResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
        const created = await this._automergeHost.createDoc(request.initialValue);
        this._pendingCreations.set(created.documentId, created);
        return { documentId: created.documentId };
      },
      catch: toServiceError,
    });
  }

  ['DataService.update'](request: DataService.UpdateRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        if (!request.updates) {
          return;
        }
        const synchronizer = this._subscriptions.get(request.subscriptionId);
        invariant(synchronizer, 'Subscription not found');

        await synchronizer.update(Context.default(), request.updates);
      },
      catch: toServiceError,
    });
  }

  ['DataService.flush'](request: DataService.FlushRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        await this._automergeHost.flush(Context.default(), request);
      },
      catch: toServiceError,
    });
  }

  ['DataService.getDocumentHeads'](
    request: DataService.GetDocumentHeadsRequest,
  ): Effect.Effect<DataService.GetDocumentHeadsResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
        const documentIds = request.documentIds;
        if (!documentIds) {
          return { heads: { entries: [] } };
        }
        const heads = await this._automergeHost.getHeads(documentIds as DocumentId[]);
        return {
          heads: {
            entries: heads.map((heads, idx) => ({ documentId: documentIds[idx], heads })),
          },
        };
      },
      catch: toServiceError,
    });
  }

  ['DataService.waitUntilHeadsReplicated'](
    request: DataService.WaitUntilHeadsReplicatedRequest,
  ): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        await this._automergeHost.waitUntilHeadsReplicated(Context.default(), request.heads);
      },
      catch: toServiceError,
    });
  }

  ['DataService.reIndexHeads'](request: DataService.ReIndexHeadsRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        await this._automergeHost.reIndexHeads((request.documentIds ?? []) as DocumentId[]);
      },
      catch: toServiceError,
    });
  }

  ['DataService.updateIndexes'](request: DataService.UpdateIndexesRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        await this._updateIndexes(request);
      },
      catch: toServiceError,
    });
  }

  ['DataService.stats'](request: DataService.DatabaseStatsRequest): Effect.Effect<DataService.DatabaseStats, Error> {
    return Effect.tryPromise({
      try: async () => {
        invariant(SpaceId.isValid(request.spaceId), 'Invalid space id');
        return this._getSpaceStats(request.spaceId);
      },
      catch: toServiceError,
    });
  }

  ['DataService.runGarbageCollection'](
    request: DataService.RunGarbageCollectionRequest,
  ): Effect.Effect<DataService.GarbageCollectionReport, Error> {
    return Effect.tryPromise({
      try: async () => {
        invariant(SpaceId.isValid(request.spaceId), 'Invalid space id');
        return this._runGarbageCollection(request.spaceId, request);
      },
      catch: toServiceError,
    });
  }

  ['DataService.subscribeProxy'](
    request: DataService.SubscribeProxyRequest,
  ): EffectStream.Stream<DataService.ProxyEventBatch, Error> {
    return EffectEx.streamFromEmitter<DataService.ProxyEventBatch, Error>((emit) => {
      const proxyHost = this.#proxyHost;
      if (!proxyHost) {
        void emit.fail(new Error('This data service serves no proxy documents.'));
        return Effect.void;
      }
      this.#proxySubscriptions.add(request.subscriptionId);
      const close = proxyHost.subscribe(
        { subscriptionId: request.subscriptionId, clientId: request.clientId },
        { onEvents: (events) => void emit.single({ events: events.map(Wire.encodeEvent) }) },
      );
      return Effect.sync(() => {
        close();
        this.#proxySubscriptions.delete(request.subscriptionId);
        this.#releaseCreationsIfNoClients();
      });
    });
  }

  ['DataService.updateProxySubscription'](
    request: DataService.UpdateProxySubscriptionRequest,
  ): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        await this.#proxy.updateSubscription(request);
        // The proxy host leases a document only for each call on it, and an idle document is saved
        // before it is evicted, so the creation lease has nothing left to guard once it is followed.
        this.#releaseCreations(request.add?.map(({ documentId }) => documentId) ?? []);
      },
      catch: toServiceError,
    });
  }

  ['DataService.submit'](request: DataService.SubmitRequest): Effect.Effect<DataService.SubmitResponse, Error> {
    return Effect.tryPromise({
      try: async () => ({
        results: await this.#proxy.submit({
          subscriptionId: request.subscriptionId,
          batches: request.batches.map((batch) => ({ ...batch, changes: Wire.decodeChanges(batch.changes, WIRE) })),
        }),
      }),
      catch: toServiceError,
    });
  }

  ['DataService.resolveCursors'](
    request: DataService.ResolveCursorsRequest,
  ): Effect.Effect<DataService.ResolveCursorsResponse, Error> {
    return Effect.tryPromise({
      try: async () => ({ positions: await this.#proxy.resolveCursors(request) }),
      catch: toServiceError,
    });
  }

  ['DataService.createCursors'](
    request: DataService.CreateCursorsRequest,
  ): Effect.Effect<DataService.CreateCursorsResponse, Error> {
    return Effect.tryPromise({
      try: async () => ({ cursors: await this.#proxy.createCursors(request) }),
      catch: toServiceError,
    });
  }

  /**
   * Test affordance: pause/resume flushing of document updates on every
   * active subscription. See `DocumentsSynchronizer.setSendUpdatesPaused`.
   */
  'setAllSubscriptionsSendUpdatesPaused'(paused: boolean): void {
    for (const synchronizer of this._subscriptions.values()) {
      synchronizer.setSendUpdatesPaused(paused);
    }
  }

  get #proxy(): Host.DocumentHost {
    invariant(this.#proxyHost, 'This data service serves no proxy documents.');
    return this.#proxyHost;
  }

  #releaseCreations(documentIds: readonly string[]): void {
    for (const documentId of documentIds) {
      this._pendingCreations.get(documentId)?.[Symbol.dispose]();
      this._pendingCreations.delete(documentId);
    }
  }

  /**
   * Nothing is left to follow a created document once the last client is gone, so its creation lease
   * would otherwise outlive every reader.
   */
  #releaseCreationsIfNoClients(): void {
    if (this._subscriptions.size > 0 || this.#proxySubscriptions.size > 0) {
      return;
    }
    for (const lease of this._pendingCreations.values()) {
      lease[Symbol.dispose]();
    }
    this._pendingCreations.clear();
  }

  ['DataService.subscribeSpaceSyncState'](
    request: DataService.GetSpaceSyncStateRequest,
  ): EffectStream.Stream<DataService.SpaceSyncState, Error> {
    return EffectEx.streamFromEmitter<DataService.SpaceSyncState, Error>((emit) => {
      const ctx = Context.default();
      const spaceId = request.spaceId;
      invariant(SpaceId.isValid(spaceId));

      const rootDocumentId = this._spaceStateManager.getSpaceRootDocumentId(spaceId);
      let collectionId = rootDocumentId && deriveCollectionIdFromSpaceId(spaceId, rootDocumentId);
      this._spaceStateManager.spaceDocumentListUpdated.on(ctx, (event) => {
        // Filter by spaceId — without this, an update for any other space rewrites our
        // collectionId to `space:<our-spaceId>:<other-space-root>`, which never has any
        // recorded peers and so the subscriber's sync-state stalls at peerCount: 0.
        if (event.spaceId !== spaceId) {
          return;
        }
        const newId = deriveCollectionIdFromSpaceId(spaceId, event.spaceRootId);
        if (newId !== collectionId) {
          collectionId = newId;
          scheduler.trigger();
        }
      });

      const scheduler = new UpdateScheduler(ctx, async () => {
        const state = collectionId ? await this._automergeHost.getCollectionSyncState(collectionId) : { peers: [] };

        void emit.single({ peers: state.peers });
      });

      this._automergeHost.collectionStateUpdated.on(ctx, (e) => {
        if (e.collectionId === collectionId) {
          scheduler.trigger();
        }
      });
      scheduler.trigger();

      return Effect.promise(() => ctx.dispose());
    });
  }
}
