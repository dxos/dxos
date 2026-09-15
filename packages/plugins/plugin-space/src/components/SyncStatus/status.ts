//
// Copyright 2024 DXOS.org
//

import { type SpaceSyncStateMap } from '@dxos/react-client/echo';

export type Status =
  | 'saving-locally'
  | 'downloading'
  | 'uploading'
  | 'stalled'
  | 'disconnected'
  | 'offline-persisted'
  | 'remote-synced';

export type StatusInput = {
  offline: boolean;
  saved: boolean;
  /** Replication is outstanding but making no progress. */
  stalled: boolean;
  needsToUpload: boolean;
  needsToDownload: boolean;
};

export const getStatus = ({ offline, saved, stalled, needsToUpload, needsToDownload }: StatusInput): Status => {
  if (!saved) {
    return 'saving-locally';
  } else if (offline) {
    // Offline with nothing outstanding is durable; offline with pending work is not.
    return needsToUpload || needsToDownload ? 'disconnected' : 'offline-persisted';
  } else if (stalled) {
    return 'stalled';
  } else if (needsToDownload) {
    return 'downloading';
  } else if (needsToUpload) {
    return 'uploading';
  } else {
    return 'remote-synced';
  }
};

export const getIcon = (status: Status) => {
  switch (status) {
    case 'saving-locally':
      return 'ph--download--regular';
    case 'downloading':
      return 'ph--cloud-arrow-down--regular';
    case 'uploading':
      return 'ph--cloud-arrow-up--regular';
    case 'stalled':
      return 'ph--cloud-warning--regular';
    case 'disconnected':
      return 'ph--cloud-slash--regular';
    case 'offline-persisted':
      return 'ph--check-circle--regular';
    case 'remote-synced':
      return 'ph--cloud-check--regular';
  }
};

/** Spaces whose EDGE sync state has local documents and none left to push; a space with no entry yet is not one. */
export const getUploadedSpaceIds = (state: SpaceSyncStateMap): string[] =>
  Object.entries(state)
    .filter(([, peer]) => peer.localDocumentCount > 0 && peer.missingOnRemote === 0 && peer.differentDocuments === 0)
    .map(([spaceId]) => spaceId);
