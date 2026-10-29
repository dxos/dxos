//
// Copyright 2021 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { UpdateScheduler } from '@dxos/async';
import { Context } from '@dxos/context';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { toServiceError } from '@dxos/protocols';
import { type DataService } from '@dxos/protocols/rpc';

import { type AutomergeHost, type DocumentLease, deriveCollectionIdFromSpaceId } from '../automerge/index.ts';
import { DocumentsSynchronizer, type DocumentsSynchronizerProps } from './documents-synchronizer.ts';
import { type IndexStatusTracker } from './index-status.ts';
import { type SpaceStateManager } from './space-state-manager.ts';

/** Space sync-state recomputations per second; the scheduler still runs a trailing pass, so the last state lands. */
const SYNC_STATE_MAX_FREQ = 2;

export type DataServiceProps = {
  automergeHost: AutomergeHost;
  spaceStateManager: SpaceStateManager;
  updateIndexes: (request: DataService.UpdateIndexesRequest) => Promise<void>;
  getSpaceStats: (spaceId: SpaceId) => Promise<DataService.DatabaseStats>;
  runGarbageCollection: (
    spaceId: SpaceId,
    options: DataService.RunGarbageCollectionRequest,
  ) => Promise<DataService.GarbageCollectionReport>;
  indexStatus: IndexStatusTracker;
  /** See {@link DocumentsSynchronizerProps.readDirectorySnapshot}. */
  readDirectorySnapshot?: DocumentsSynchronizerProps['readDirectorySnapshot'];
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
  private readonly '_pendingCreations' = new Map<DocumentId, DocumentLease>();

  private readonly '_automergeHost': AutomergeHost;
  private readonly '_spaceStateManager': SpaceStateManager;
  private readonly '_indexStatus': IndexStatusTracker;
  readonly #readDirectorySnapshot: DataServiceProps['readDirectorySnapshot'];
  private readonly '_updateIndexes': (request: DataService.UpdateIndexesRequest) => Promise<void>;
  private readonly '_getSpaceStats': (spaceId: SpaceId) => Promise<DataService.DatabaseStats>;
  private readonly '_runGarbageCollection': (
    spaceId: SpaceId,
    options: DataService.RunGarbageCollectionRequest,
  ) => Promise<DataService.GarbageCollectionReport>;

  'constructor'(params: DataServiceProps) {
    this._automergeHost = params.automergeHost;
    this._spaceStateManager = params.spaceStateManager;
    this._updateIndexes = params.updateIndexes;
    this._getSpaceStats = params.getSpaceStats;
    this._runGarbageCollection = params.runGarbageCollection;
    this._indexStatus = params.indexStatus;
    this.#readDirectorySnapshot = params.readDirectorySnapshot;
  }

  ['DataService.subscribe'](
    request: DataService.SubscribeRequest,
  ): EffectStream.Stream<DataService.BatchedDocumentUpdates, Error> {
    return EffectEx.streamFromEmitter<DataService.BatchedDocumentUpdates, Error>((emit) => {
      const synchronizer = new DocumentsSynchronizer({
        automergeHost: this._automergeHost,
        sendUpdates: (updates) => void emit.single(updates),
        readDirectorySnapshot: this.#readDirectorySnapshot,
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
        // Nothing is left to subscribe to a created document once the last client is gone, so its
        // creation lease would otherwise outlive every reader.
        if (this._subscriptions.size === 0) {
          for (const lease of this._pendingCreations.values()) {
            lease[Symbol.dispose]();
          }
          this._pendingCreations.clear();
        }
        void synchronizer.close();
      });
    });
  }

  ['DataService.updateSubscription'](request: DataService.UpdateSubscriptionRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        const synchronizer = this._subscriptions.get(request.subscriptionId);
        invariant(synchronizer, 'Subscription not found');

        if (request.add?.length) {
          await synchronizer.addDocuments(
            request.add.map(({ id, heads, passive }) => ({ documentId: id as DocumentId, heads, passive })),
          );
          // The subscription now holds each document, so the creation lease has nothing left to guard.
          for (const { id } of request.add) {
            const documentId = id as DocumentId;
            this._pendingCreations.get(documentId)?.[Symbol.dispose]();
            this._pendingCreations.delete(documentId);
          }
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
        if (request.initialValue && !request.initialDocument) {
          log.warn('document created from deprecated `initialValue`; send `initialDocument` bytes', {
            spaceId: request.spaceId,
          });
        }
        const created = request.initialDocument
          ? await this._automergeHost.createDoc(request.initialDocument, { preserveHistory: true })
          : await this._automergeHost.createDoc(request.initialValue);
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

  /** Whether any of the given subscriptions holds the document, passive or loaded. */
  'holds'(subscriptionIds: readonly string[], documentId: DocumentId): boolean {
    return subscriptionIds.some((subscriptionId) => this._subscriptions.get(subscriptionId)?.holds(documentId));
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

  ['DataService.subscribeIndexStatus'](): EffectStream.Stream<DataService.IndexStatus, Error> {
    return EffectEx.streamFromEmitter<DataService.IndexStatus, Error>((emit) => {
      const ctx = Context.default();
      this._indexStatus.updated.on(ctx, (status) => void emit.single(status));
      void emit.single(this._indexStatus.current);
      return Effect.promise(() => ctx.dispose());
    });
  }

  ['DataService.subscribeIndexActivity'](): EffectStream.Stream<DataService.IndexActivity, Error> {
    return EffectEx.streamFromEmitter<DataService.IndexActivity, Error>((emit) => {
      const ctx = Context.default();
      this._indexStatus.activityUpdated.on(ctx, (activity) => void emit.single(activity));
      void emit.single(this._indexStatus.activity);
      return Effect.promise(() => ctx.dispose());
    });
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

      // Every local save fires `collectionStateUpdated`, and each run diffs every document against every
      // peer, so an unthrottled stream re-diffs the whole space per keystroke for a status indicator.
      const scheduler = new UpdateScheduler(
        ctx,
        async () => {
          const state = collectionId ? await this._automergeHost.getCollectionSyncState(collectionId) : { peers: [] };

          void emit.single({ peers: state.peers });
        },
        { maxFrequency: SYNC_STATE_MAX_FREQ },
      );

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
