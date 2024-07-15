//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { next as am } from '@dxos/automerge/automerge';
import type { DocumentId, PeerId } from '@dxos/automerge/automerge-repo';
import { Resource } from '@dxos/context';
import { defaultMap } from '@dxos/util';

/*

Notes:

- Pull model
- Request remote state on startup with some jitter.
- Re-request every 30 seconds.
- Test if AM-repo syncs freshly loaded doc with no further local changes.
- Queue for background replication.

*/

export type CollectionSynchronizerParams = {
  sendCollectionState: (collectionId: string, peerId: PeerId, state: CollectionState) => void;
  queryCollectionState: (collectionId: string, peerId: PeerId) => void;
  shouldSyncCollection: (collectionId: string, peerId: PeerId) => Promise<boolean>;
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

  private readonly _connectedPeers = new Set<PeerId>();

  public readonly remoteStateUpdated = new Event<{ collectionId: string; peerId: PeerId }>();

  constructor(params: CollectionSynchronizerParams) {
    super();
    this._sendCollectionState = params.sendCollectionState;
    this._queryCollectionState = params.queryCollectionState;
    this._shouldSyncCollection = params.shouldSyncCollection;
  }

  getRegisteredCollectionIds(): string[] {
    return [...this._perCollectionStates.keys()];
  }

  getLocalCollectionState(collectionId: string): CollectionState | undefined {
    return this._getPerCollectionState(collectionId).localState;
  }

  setLocalCollectionState(collectionId: string, state: CollectionState) {
    this._getPerCollectionState(collectionId).localState = state;

    queueMicrotask(async () => {
      for (const peerId of this._connectedPeers) {
        await this._refreshInterestedPeers(collectionId, peerId);
      }

      this.refreshCollection(collectionId);
    });
  }

  getRemoteCollectionStates(collectionId: string): ReadonlyMap<PeerId, CollectionState> {
    return this._getPerCollectionState(collectionId).remoteStates;
  }

  refreshCollection(collectionId: string) {
    const state = this._getPerCollectionState(collectionId);
    for (const peerId of this._connectedPeers) {
      if (state.interestedPeers.has(peerId)) {
        this._queryCollectionState(collectionId, peerId);
      }
    }
  }

  /**
   * Callback when a connection to a peer is established.
   */
  onConnectionOpen(peerId: PeerId) {
    this._connectedPeers.add(peerId);

    queueMicrotask(async () => {
      for (const collectionId of this._perCollectionStates.keys()) {
        await this._refreshInterestedPeers(collectionId, peerId);
      }

      for (const collectionId of this._perCollectionStates.keys()) {
        this.refreshCollection(collectionId);
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
    const perCollectionState = this._getPerCollectionState(collectionId);

    if (perCollectionState.localState) {
      this._sendCollectionState(collectionId, peerId, perCollectionState.localState);
    }
  }

  /**
   * Callback when a peer sends the state of a collection.
   */
  onRemoteStateReceived(collectionId: string, peerId: PeerId, state: CollectionState) {
    const perCollectionState = this._getPerCollectionState(collectionId);
    perCollectionState.remoteStates.set(peerId, state);
    this.remoteStateUpdated.emit({ peerId, collectionId });
  }

  private _getPerCollectionState(collectionId: string): PerCollectionState {
    return defaultMap(this._perCollectionStates, collectionId, () => ({
      localState: undefined,
      remoteStates: new Map(),
      interestedPeers: new Set(),
    }));
  }

  private async _refreshInterestedPeers(collectionId: string, peerId: PeerId) {
    const shouldSync = await this._shouldSyncCollection(collectionId, peerId);

    if (shouldSync) {
      this._getPerCollectionState(collectionId).interestedPeers.add(peerId);
    } else {
      this._getPerCollectionState(collectionId).interestedPeers.delete(peerId);
    }
  }
}

type PerCollectionState = {
  localState?: CollectionState;
  remoteStates: Map<PeerId, CollectionState>;
  interestedPeers: Set<PeerId>;
};

export type CollectionState = {
  /**
   * DocumentId -> Heads.
   */
  documents: Record<string, string[]>;
};

export type CollectionStateDiff = {
  different: DocumentId[];
};

export const diffCollectionState = (local: CollectionState, remote: CollectionState): CollectionStateDiff => {
  const allDocuments = new Set<DocumentId>([...Object.keys(local.documents), ...Object.keys(remote.documents)] as any);

  const different: DocumentId[] = [];
  for (const documentId of allDocuments) {
    if (
      !local.documents[documentId] ||
      !remote.documents[documentId] ||
      !am.equals(local.documents[documentId], remote.documents[documentId])
    ) {
      different.push(documentId as DocumentId);
    }
  }

  return { different };
};
