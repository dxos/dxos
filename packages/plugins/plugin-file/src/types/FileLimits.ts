//
// Copyright 2026 DXOS.org
//

export const ACCEPTED_MIME: Record<string, string[]> = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  'video/*': ['.mp4', '.webm', '.mov'],
  'application/pdf': ['.pdf'],
};

export const isAcceptedMimeType = (type: string): boolean => {
  if (type === 'application/pdf') {
    return true;
  }
  if (type.startsWith('image/') || type.startsWith('video/')) {
    return true;
  }
  return false;
};
