//
// Copyright 2024 DXOS.org
//

export type Status =
  | 'saving-locally'
  | 'downloading'
  | 'uploading'
  | 'disconnected'
  | 'offline-persisted'
  | 'remote-synced';

export type StatusInput = {
  offline: boolean;
  saved: boolean;
  needsToUpload: boolean;
  needsToDownload: boolean;
};

export const getStatus = ({ offline, saved, needsToUpload, needsToDownload }: StatusInput): Status => {
  if (!saved) {
    return 'saving-locally';
  } else if (offline) {
    // Offline with nothing outstanding is durable; offline with pending work is not.
    return needsToUpload || needsToDownload ? 'disconnected' : 'offline-persisted';
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
    case 'disconnected':
      return 'ph--cloud-slash--regular';
    case 'offline-persisted':
      return 'ph--check-circle--regular';
    case 'remote-synced':
      return 'ph--cloud-check--regular';
  }
};

/**
 * Valence for the indicator: no connection with unsynced work is an error.
 */
export const getStatusStyle = (status: Status): string | undefined => {
  switch (status) {
    case 'disconnected':
      return 'text-error-text';
    default:
      return undefined;
  }
};
