//
// Copyright 2024 DXOS.org
//

import { type FallbackValue } from '@dxos/util';

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
