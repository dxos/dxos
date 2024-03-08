//
// Copyright 2024 DXOS.org
//

import { type FallbackValue } from '@dxos/util';

export type MessageMetadata = {
  id: string; // TODO(burdon): Remove/rename?
  authorId?: string;
  authorName?: string;
  authorImgSrc?: string;
  authorAvatarProps?: FallbackValue;
};

export type MessageEntityBlock<BlockValue> = BlockValue & {
  timestamp?: string;
};

export type MessageEntity<BlockValue> = MessageMetadata & {
  blocks: MessageEntityBlock<BlockValue>[];
};

export type ThreadEntity = {
  topicId?: string;
  topicTitle?: string;
};
