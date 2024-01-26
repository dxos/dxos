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

export type MessageEntityBlock = {
  timestamp?: string;
  text?: string;
  data?: any;
  [key: string]: any;
};

export type MessageEntity = MessageMetadata & {
  blocks: MessageEntityBlock[];
};

export type ThreadEntity = MessageMetadata & {
  topicId?: string;
  topicTitle?: string;
};
