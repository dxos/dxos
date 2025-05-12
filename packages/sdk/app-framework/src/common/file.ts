//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

// TODO(burdon): See Accept attribute (uses MIME types).
// E.g., 'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
export const defaultFileTypes = {
  images: ['png', 'jpg', 'jpeg', 'gif'],
  media: ['mp3', 'mp4', 'mov', 'avi'],
  text: ['pdf', 'txt', 'md'],
};

export const FileInfoSchema = S.Struct({
  name: S.String,
  type: S.String,
  url: S.optional(S.String),
  cid: S.optional(S.String), // TODO(burdon): Meta key? Or other common properties with other file management system? (e.g., WNFS).
});

export type FileInfo = S.Schema.Type<typeof FileInfoSchema>;
