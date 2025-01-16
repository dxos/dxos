//
// Copyright 2024 DXOS.org
//

// TODO(burdon): See Accept attribute (uses MIME types).
// E.g., 'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
export const defaultFileTypes = {
  images: ['png', 'jpg', 'jpeg', 'gif'],
  media: ['mp3', 'mp4', 'mov', 'avi'],
  text: ['pdf', 'txt', 'md'],
};

export type FileInfo = {
  url?: string;
  cid?: string; // TODO(burdon): Meta key? Or other common properties with other file management system? (e.g., WNFS).
};
