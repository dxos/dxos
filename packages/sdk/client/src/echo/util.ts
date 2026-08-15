//
// Copyright 2023 DXOS.org
//

import { type SpaceSyncState } from '@dxos/echo-client';
import { type SpaceId } from '@dxos/keys';

type PeerCounts = Omit<SpaceSyncState.PeerState, 'peerId'>;
export type PeerSyncState = { -readonly [Key in keyof PeerCounts]: PeerCounts[Key] };

export type SpaceSyncStateMap = Record<SpaceId, PeerSyncState>;

export const createEmptyEdgeSyncState = (): PeerSyncState => ({
  missingOnLocal: 0,
  missingOnRemote: 0,
  localDocumentCount: 0,
  remoteDocumentCount: 0,
  differentDocuments: 0,
  totalDocumentCount: 0,
  unsyncedDocumentCount: 0,
});

export const getSyncSummary = (syncMap: SpaceSyncStateMap): PeerSyncState => {
  return Object.entries(syncMap).reduce<PeerSyncState>((summary, [_spaceId, peerState]) => {
    summary.missingOnLocal += peerState.missingOnLocal;
    summary.missingOnRemote += peerState.missingOnRemote;
    summary.localDocumentCount += peerState.localDocumentCount;
    summary.remoteDocumentCount += peerState.remoteDocumentCount;
    summary.differentDocuments += peerState.differentDocuments;
    summary.totalDocumentCount += peerState.totalDocumentCount;
    summary.unsyncedDocumentCount += peerState.unsyncedDocumentCount;
    return summary;
  }, createEmptyEdgeSyncState());
};
