import { Event } from '@dxos/async';
import type { PeerId } from '@dxos/automerge/automerge-repo';
import { Resource } from '@dxos/context';
import { defaultMap } from '@dxos/util';

export type CollectionSynchronizerParams = {
  sendCollectionState: (collectionId: string, peerId: PeerId, state: CollectionState) => void;
  queryCollectionState: (collectionId: string, peerId: PeerId) => void;
};

/**
 * Implements collection sync protocol.
 */
export class CollectionSynchronizer extends Resource {
  private readonly _sendCollectionState: CollectionSynchronizerParams['sendCollectionState'];
  private readonly _queryCollectionState: CollectionSynchronizerParams['queryCollectionState'];

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
  }

  getLocalCollectionState(collectionId: string): CollectionState | undefined {
    return this._getPerCollectionState(collectionId).localState;
  }

  setLocalCollectionState(collectionId: string, state: CollectionState) {
    this._getPerCollectionState(collectionId).localState = state;
  }

  getRemoteCollectionStates(collectionId: string): ReadonlyMap<PeerId, CollectionState> {
    return this._getPerCollectionState(collectionId).remoteStates;
  }

  /**
   * Synchronize this collection with the given peer.
   */
  synchronizeCollection(collectionId: string, peerId: PeerId) {
    this._getPerCollectionState(collectionId).interestedPeers.add(peerId);
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

    for (const [collectionId, perCollectionState] of this._perCollectionStates) {
      if (perCollectionState.localState && perCollectionState.interestedPeers.has(peerId)) {
        this._queryCollectionState(collectionId, peerId);
      }
    }
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
}

export type CollectionState = {
  /**
   * DocumentId -> Heads.
   */
  documents: Record<string, string[]>;
};

type PerCollectionState = {
  localState?: CollectionState;
  remoteStates: Map<PeerId, CollectionState>;
  interestedPeers: Set<PeerId>;
};

/*

- Pull model
- Request remote state on startup with some jitter.
- Re-request every 30 seconds.
- Test if AM-repo syncs freshly loaded doc with no further local changes.
- Queue for background replication.

*/
