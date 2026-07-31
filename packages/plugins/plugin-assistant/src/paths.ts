//
// Copyright 2025 DXOS.org
//

import { GraphPath } from '@dxos/app-toolkit';
import { Chat } from '@dxos/assistant-toolkit';

const { getSectionPath: getChatsPath, getObjectPath: getChatPath } = GraphPath.createTypeSectionPaths(Chat.Chat, {
  groupId: GraphPath.GroupSegments.ai,
});

export { getChatPath, getChatsPath };
