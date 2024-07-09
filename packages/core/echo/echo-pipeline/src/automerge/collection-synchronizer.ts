import { Event } from '@dxos/async';
import type { PeerId } from '@dxos/automerge/automerge-repo';
import { Resource } from '@dxos/context';
import { defaultMap } from '@dxos/util';

export type CollectionSynchronizerParams = {
  sendCollectionState: (peerId: PeerId, collectionId: string, state: CollectionState) => void;
};

export class CollectionSynchronizer extends Resource {
  private readonly _sendCollectionState: CollectionSynchronizerParams['sendCollectionState'];

  /**
   * CollectionId -> State.
   */
  private readonly _perCollectionStates = new Map<string, PerCollectionState>();

  private readonly _connectedPeers = new Set<PeerId>();

  public readonly remoteStateUpdated = new Event<{ peerId: PeerId; collectionId: string }>();

  constructor(private readonly params: CollectionSynchronizerParams) {
    super();
    this._sendCollectionState = params.sendCollectionState;
  }

  setLocalCollectionState(collectionId: string, state: CollectionState) {
    this._getPerCollectionState(collectionId).localState = state;
  }

  onConnectionOpen(peerId: PeerId) {
    this._connectedPeers.add(peerId);

    for (const [collectionId, perCollectionState] of this._perCollectionStates) {
      if (perCollectionState.localState && perCollectionState.interestedPeers.has(peerId)) {
        this._sendCollectionState(peerId, collectionId, perCollectionState.localState);
      }
    }
  }

  onConnectionClosed(peerId: PeerId) {
    this._connectedPeers.delete(peerId);

    for (const perCollectionState of this._perCollectionStates.values()) {
      perCollectionState.remoteStates.delete(peerId);
      perCollectionState.interestedPeers.delete(peerId);
    }
  }

  onCollectionStateQueried(collectionId: string, peerId: PeerId) {
    const perCollectionState = this._getPerCollectionState(collectionId);
    perCollectionState.interestedPeers.add(peerId);

    if (perCollectionState.localState) {
      this._sendCollectionState(peerId, collectionId, perCollectionState.localState);
    }
  }

  onRemoveStateReceived(peerId: PeerId, collectionId: string, state: CollectionState) {
    const perCollectionState = this._getPerCollectionState(collectionId);
    perCollectionState.remoteStates.set(peerId, state);
    perCollectionState.interestedPeers.add(peerId);
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
