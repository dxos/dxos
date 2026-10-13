//
// Copyright 2024 DXOS.org
//

import { type SaveState } from './save-tracker.ts';

export type Status =
  | 'persistence-error'
  | 'saving-locally'
  | 'downloading'
  | 'uploading'
  | 'stalled'
  | 'disconnected'
  | 'offline-persisted'
  | 'remote-synced';

export type StatusInput = {
  offline: boolean;
  save: SaveState;
  /** Replication is outstanding but making no progress. */
  stalled: boolean;
  needsToUpload: boolean;
  needsToDownload: boolean;
};

export const getStatus = ({ offline, save, stalled, needsToUpload, needsToDownload }: StatusInput): Status => {
  if (save === 'failing') {
    return 'persistence-error';
  } else if (save === 'saving') {
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
    case 'persistence-error':
      return 'ph--warning--regular';
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
