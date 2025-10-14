//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

// TODO(burdon): See Accept attribute (uses MIME types).
// E.g., 'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
export const defaultFileTypes = {
  images: ['png', 'jpg', 'jpeg', 'gif'],
  media: ['mp3', 'mp4', 'mov', 'avi'],
  text: ['pdf', 'txt', 'md'],
};

export const FileInfoSchema = Schema.Struct({
  name: Schema.String,
  type: Schema.String,
  url: Schema.optional(Schema.String),
  cid: Schema.optional(Schema.String), // TODO(burdon): Meta key? Or other common properties with other file management system? (e.g., WNFS).
});

export type FileInfo = Schema.Schema.Type<typeof FileInfoSchema>;
