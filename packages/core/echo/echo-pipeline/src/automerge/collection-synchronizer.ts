import type { PeerId } from '@dxos/automerge/automerge-repo';
import { Resource } from '@dxos/context';

export type CollectionSynchronizerParams = {
  sendCollectionState: (peerId: PeerId, collectionId: string, state: unknown) => void;
};

export class CollectionSynchronizer extends Resource {
  onCollectionStateQueried(collectionId: string, peerId: PeerId) {}

  updateRemoteState(peerId: PeerId, collectionId: string, state: unknown) {}
}

export type CollectionState = {
  /**
   * DocumentId -> Heads.
   */
  documents: Record<string, string[]>;
};
