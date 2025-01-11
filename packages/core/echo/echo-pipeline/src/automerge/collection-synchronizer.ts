//
// Copyright 2024 DXOS.org
//

import { asyncReturn, Event, scheduleTask, scheduleTaskInterval } from '@dxos/async';
import { next as am } from '@dxos/automerge/automerge';
import type { DocumentId, PeerId } from '@dxos/automerge/automerge-repo';
import { Resource, type Context } from '@dxos/context';
import { log } from '@dxos/log';
import { defaultMap } from '@dxos/util';

const MIN_QUERY_INTERVAL = 5_000;

const POLL_INTERVAL = 30_000;

export type CollectionSynchronizerParams = {
  sendCollectionState: (collectionId: string, peerId: PeerId, state: CollectionState) => void;
  queryCollectionState: (collectionId: string, peerId: PeerId) => void;
  shouldSyncCollection: (collectionId: string, peerId: PeerId) => boolean;
};

/**
 * Implements collection sync protocol.
 */
export class CollectionSynchronizer extends Resource {
  private readonly _sendCollectionState: CollectionSynchronizerParams['sendCollectionState'];
  private readonly _queryCollectionState: CollectionSynchronizerParams['queryCollectionState'];
  private readonly _shouldSyncCollection: CollectionSynchronizerParams['shouldSyncCollection'];

  /**
   * CollectionId -> State.
   */
  private readonly _perCollectionStates = new Map<string, PerCollectionState>();
  private readonly _activeCollections = new Set<string>();

  private readonly _connectedPeers = new Set<PeerId>();

  public readonly remoteStateUpdated = new Event<{ collectionId: string; peerId: PeerId; newDocsAppeared: boolean }>();

  constructor(params: CollectionSynchronizerParams) {
    super();
    this._sendCollectionState = params.sendCollectionState;
    this._queryCollectionState = params.queryCollectionState;
    this._shouldSyncCollection = params.shouldSyncCollection;
  }

  protected override async _open(ctx: Context): Promise<void> {
    scheduleTaskInterval(
      this._ctx,
      async () => {
        for (const collectionId of this._perCollectionStates.keys()) {
          if (this._activeCollections.has(collectionId)) {
            this.refreshCollection(collectionId);
            await asyncReturn();
          }
        }
      },
      POLL_INTERVAL,
    );
  }

  getRegisteredCollectionIds(): string[] {
    return [...this._activeCollections];
  }

  getLocalCollectionState(collectionId: string): CollectionState | undefined {
    return this._perCollectionStates.get(collectionId)?.localState;
  }

  setLocalCollectionState(collectionId: string, state: CollectionState) {
    this._activeCollections.add(collectionId);

    log('setLocalCollectionState', { collectionId, state });
    this._getOrCreatePerCollectionState(collectionId).localState = state;

    queueMicrotask(async () => {
      if (!this._ctx.disposed && this._activeCollections.has(collectionId)) {
        this._refreshInterestedPeers(collectionId);
        this.refreshCollection(collectionId);
      }
    });
  }

  clearLocalCollectionState(collectionId: string) {
    this._activeCollections.delete(collectionId);
    this._perCollectionStates.delete(collectionId);
    log('clearLocalCollectionState', { collectionId });
  }

  getRemoteCollectionStates(collectionId: string): ReadonlyMap<PeerId, CollectionState> {
    return this._getOrCreatePerCollectionState(collectionId).remoteStates;
  }

  refreshCollection(collectionId: string) {
    let scheduleAnotherRefresh = false;
    const state = this._getOrCreatePerCollectionState(collectionId);
    for (const peerId of this._connectedPeers) {
      if (state.interestedPeers.has(peerId)) {
        const lastQueried = state.lastQueried.get(peerId) ?? 0;
        if (Date.now() - lastQueried > MIN_QUERY_INTERVAL) {
          state.lastQueried.set(peerId, Date.now());
          this._queryCollectionState(collectionId, peerId);
        } else {
          scheduleAnotherRefresh = true;
        }
      }
    }
    if (scheduleAnotherRefresh) {
      scheduleTask(this._ctx, () => this.refreshCollection(collectionId), MIN_QUERY_INTERVAL);
    }
  }

  /**
   * Callback when a connection to a peer is established.
   */
  onConnectionOpen(peerId: PeerId) {
    this._connectedPeers.add(peerId);

    queueMicrotask(async () => {
      if (this._ctx.disposed) {
        return;
      }
      for (const [collectionId, state] of this._perCollectionStates.entries()) {
        if (this._activeCollections.has(collectionId) && this._shouldSyncCollection(collectionId, peerId)) {
          state.interestedPeers.add(peerId);
          state.lastQueried.set(peerId, Date.now());
          this._queryCollectionState(collectionId, peerId);
        }
      }
    });
  }

  /**
   * Callback when a connection to a peer is closed.
   */
  onConnectionClosed(peerId: PeerId) {
    this._connectedPeers.delete(peerId);

    for (const perCollectionState of this._perCollectionStates.values()) {
      perCollectionState.remoteStates.delete(peerId);
    }
  }

  /**
   * Callback when a peer queries the state of a collection.
   */
  onCollectionStateQueried(collectionId: string, peerId: PeerId) {
    const perCollectionState = this._getOrCreatePerCollectionState(collectionId);

    if (perCollectionState.localState) {
      this._sendCollectionState(collectionId, peerId, perCollectionState.localState);
    }
  }

  /**
   * Callback when a peer sends the state of a collection.
   */
  onRemoteStateReceived(collectionId: string, peerId: PeerId, state: CollectionState) {
    log('onRemoteStateReceived', { collectionId, peerId, state });
    validateCollectionState(state);
    const perCollectionState = this._getOrCreatePerCollectionState(collectionId);
    const existingState = perCollectionState.remoteStates.get(peerId) ?? { documents: {} };
    const diff = diffCollectionState(existingState, state);
    if (diff.missingOnLocal.length > 0 || diff.different.length > 0) {
      perCollectionState.remoteStates.set(peerId, state);
      this.remoteStateUpdated.emit({ peerId, collectionId, newDocsAppeared: diff.missingOnLocal.length > 0 });
    }
  }

  private _getOrCreatePerCollectionState(collectionId: string): PerCollectionState {
    return defaultMap(this._perCollectionStates, collectionId, () => ({
      localState: undefined,
      remoteStates: new Map(),
      interestedPeers: new Set(),
      lastQueried: new Map(),
    }));
  }

  private _refreshInterestedPeers(collectionId: string) {
    for (const peerId of this._connectedPeers) {
      if (this._shouldSyncCollection(collectionId, peerId)) {
        this._getOrCreatePerCollectionState(collectionId).interestedPeers.add(peerId);
      } else {
        this._getOrCreatePerCollectionState(collectionId).interestedPeers.delete(peerId);
      }
    }
  }
}

type PerCollectionState = {
  localState?: CollectionState;
  remoteStates: Map<PeerId, CollectionState>;
  interestedPeers: Set<PeerId>;
  lastQueried: Map<PeerId, number>;
};

export type CollectionState = {
  /**
   * DocumentId -> Heads.
   */
  documents: Record<string, string[]>;
};

export type CollectionStateDiff = {
  missingOnRemote: DocumentId[];
  missingOnLocal: DocumentId[];
  different: DocumentId[];
};

export const diffCollectionState = (local: CollectionState, remote: CollectionState): CollectionStateDiff => {
  const allDocuments = new Set<DocumentId>([...Object.keys(local.documents), ...Object.keys(remote.documents)] as any);

  const missingOnRemote: DocumentId[] = [];
  const missingOnLocal: DocumentId[] = [];
  const different: DocumentId[] = [];
  for (const documentId of allDocuments) {
    if (!local.documents[documentId]) {
      missingOnLocal.push(documentId as DocumentId);
    } else if (!remote.documents[documentId]) {
      missingOnRemote.push(documentId as DocumentId);
    } else if (!am.equals(local.documents[documentId], remote.documents[documentId])) {
      different.push(documentId as DocumentId);
    }
  }

  return {
    missingOnRemote,
    missingOnLocal,
    different,
  };
};

const validateCollectionState = (state: CollectionState) => {
  Object.entries(state.documents).forEach(([documentId, heads]) => {
    if (!isValidDocumentId(documentId as DocumentId)) {
      throw new Error(`Invalid documentId: ${documentId}`);
    }
    if (Array.isArray(heads) && heads.some((head) => typeof head !== 'string')) {
      throw new Error(`Invalid heads: ${heads}`);
    }
  });
};

const isValidDocumentId = (documentId: DocumentId) => {
  return typeof documentId === 'string' && !documentId.includes(':');
};
