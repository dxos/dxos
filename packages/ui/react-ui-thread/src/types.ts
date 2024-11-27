//
// Copyright 2024 DXOS.org
//

import { type FallbackValue } from '@dxos/util';

// TODO(burdon): Move ThreadType S.Schema type here.

export type MessageMetadata = {
  id: string;
  timestamp?: string;
  authorId?: string;
  authorName?: string;
  authorImgSrc?: string;
  authorAvatarProps?: FallbackValue;
};

export type ThreadEntity = {
  topicId?: string;
  topicTitle?: string;
};
