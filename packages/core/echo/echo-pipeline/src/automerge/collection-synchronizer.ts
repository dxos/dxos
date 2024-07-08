import type { PeerId } from '@dxos/automerge/automerge-repo';

export class CollectionSynchronizer {

  onCollectionStateQueried(collectionId: string, peerId: PeerId) {}

  updateRemoteState(peerId: PeerId, collectionId: string, state: unknown) {}
}
