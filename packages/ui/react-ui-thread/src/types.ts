//
// Copyright 2024 DXOS.org
//

import type { AvatarStatus } from '@dxos/react-ui';

export type MessageMetadata = {
  id: string;
  authorId: string;
  authorName?: string;
  authorImgSrc?: string;
  authorStatus?: AvatarStatus;
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
