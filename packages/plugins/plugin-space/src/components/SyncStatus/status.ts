//
// Copyright 2024 DXOS.org
//

export type Status = 'saving locally' | 'downloading' | 'uploading' | 'offline persisted' | 'remote synced';

export const getStatus = ({
  offline,
  saved,
  needsToUpload,
  needsToDownload,
}: {
  offline: boolean;
  saved: boolean;
  needsToUpload: boolean;
  needsToDownload: boolean;
}): Status => {
  if (!saved) {
    return 'saving locally';
  } else if (!offline && needsToDownload) {
    return 'downloading';
  } else if (!offline && needsToUpload) {
    return 'uploading';
  } else if (offline && !needsToUpload && !needsToDownload) {
    return 'offline persisted';
  } else {
    return 'remote synced';
  }
};

export const getIcon = (status: Status) => {
  switch (status) {
    case 'saving locally':
      return 'ph--download--regular';
    case 'downloading':
      return 'ph--cloud-arrow-down--regular';
    case 'uploading':
      return 'ph--cloud-arrow-up--regular';
    case 'offline persisted':
      return 'ph--check-circle--regular';
    case 'remote synced':
      return 'ph--cloud-check--regular';
  }
};
