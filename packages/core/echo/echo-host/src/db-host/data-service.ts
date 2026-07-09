//
// Copyright 2021 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { UpdateScheduler } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type BatchedDocumentUpdates,
  type CreateDocumentRequest,
  type CreateDocumentResponse,
  type FlushRequest,
  type GetDocumentHeadsRequest,
  type GetDocumentHeadsResponse,
  type GetSpaceSyncStateRequest,
  type ReIndexHeadsRequest,
  type SpaceSyncState,
  type SubscribeRequest,
  type UpdateRequest,
  type UpdateSubscriptionRequest,
  type WaitUntilHeadsReplicatedRequest,
} from '@dxos/protocols/proto/dxos/echo/service';
import { type DataService } from '@dxos/protocols/rpc';

import { type AutomergeHost, deriveCollectionIdFromSpaceId } from '../automerge';
import { DocumentsSynchronizer } from './documents-synchronizer';
import { type SpaceStateManager } from './space-state-manager';

export type DataServiceProps = {
  automergeHost: AutomergeHost;
  spaceStateManager: SpaceStateManager;
  updateIndexes: () => Promise<void>;
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
  private readonly _subscriptions = new Map<string, DocumentsSynchronizer>();

  private readonly _automergeHost: AutomergeHost;
  private readonly _spaceStateManager: SpaceStateManager;
  private readonly _updateIndexes: () => Promise<void>;

  constructor(params: DataServiceProps) {
    this._automergeHost = params.automergeHost;
    this._spaceStateManager = params.spaceStateManager;
    this._updateIndexes = params.updateIndexes;
  }

  ['DataService.subscribe'](request: SubscribeRequest): EffectStream.Stream<BatchedDocumentUpdates, Error> {
    return EffectStream.async<BatchedDocumentUpdates, Error>((emit) => {
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
      return Effect.sync(() => void synchronizer.close());
    });
  }

  ['DataService.updateSubscription'](request: UpdateSubscriptionRequest): Effect.Effect<void, Error> {
    return Effect.promise(async () => {
      const synchronizer = this._subscriptions.get(request.subscriptionId);
      invariant(synchronizer, 'Subscription not found');

      if (request.addIds?.length) {
        await synchronizer.addDocuments(request.addIds as DocumentId[]);
      }
      if (request.removeIds?.length) {
        await synchronizer.removeDocuments(request.removeIds as DocumentId[]);
      }
    });
  }

  ['DataService.createDocument'](request: CreateDocumentRequest): Effect.Effect<CreateDocumentResponse, Error> {
    return Effect.promise(async () => {
      const handle = await this._automergeHost.createDoc(request.initialValue);
      return { documentId: handle.documentId };
    });
  }

  ['DataService.update'](request: UpdateRequest): Effect.Effect<void, Error> {
    return Effect.promise(async () => {
      if (!request.updates) {
        return;
      }
      const synchronizer = this._subscriptions.get(request.subscriptionId);
      invariant(synchronizer, 'Subscription not found');

      await synchronizer.update(Context.default(), request.updates);
    });
  }

  ['DataService.flush'](request: FlushRequest): Effect.Effect<void, Error> {
    return Effect.promise(async () => {
      await this._automergeHost.flush(Context.default(), request);
    });
  }

  ['DataService.getDocumentHeads'](request: GetDocumentHeadsRequest): Effect.Effect<GetDocumentHeadsResponse, Error> {
    return Effect.promise(async () => {
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
    });
  }

  ['DataService.waitUntilHeadsReplicated'](request: WaitUntilHeadsReplicatedRequest): Effect.Effect<void, Error> {
    return Effect.promise(async () => {
      await this._automergeHost.waitUntilHeadsReplicated(Context.default(), request.heads);
    });
  }

  ['DataService.reIndexHeads'](request: ReIndexHeadsRequest): Effect.Effect<void, Error> {
    return Effect.promise(async () => {
      await this._automergeHost.reIndexHeads((request.documentIds ?? []) as DocumentId[]);
    });
  }

  ['DataService.updateIndexes'](): Effect.Effect<void, Error> {
    return Effect.promise(async () => {
      await this._updateIndexes();
    });
  }

  /**
   * Test affordance: pause/resume flushing of document updates on every
   * active subscription. See `DocumentsSynchronizer.setSendUpdatesPaused`.
   */
  setAllSubscriptionsSendUpdatesPaused(paused: boolean): void {
    for (const synchronizer of this._subscriptions.values()) {
      synchronizer.setSendUpdatesPaused(paused);
    }
  }

  ['DataService.subscribeSpaceSyncState'](request: GetSpaceSyncStateRequest): EffectStream.Stream<SpaceSyncState, Error> {
    return EffectStream.async<SpaceSyncState, Error>((emit) => {
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
