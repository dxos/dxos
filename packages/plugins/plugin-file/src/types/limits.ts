//
// Copyright 2026 DXOS.org
//

export const MAX_FILE_SIZE = 4 * 1024 * 1024;

export const ACCEPTED_MIME: Record<string, string[]> = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  'application/pdf': ['.pdf'],
};

export const isAcceptedMimeType = (type: string): boolean => {
  if (type === 'application/pdf') {
    return true;
  }
  if (type.startsWith('image/')) {
    return true;
  }
  return false;
};
