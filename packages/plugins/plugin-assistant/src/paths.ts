//
// Copyright 2025 DXOS.org
//

import { AppNode, Paths } from '@dxos/app-toolkit';
import { Chat } from '@dxos/assistant-toolkit';

const { getSectionPath: getChatsPath, getObjectPath: getChatPath } = Paths.createTypeSectionPaths(Chat.Chat, {
  groupId: AppNode.NAV_TREE_GROUP_AI_ID,
});

export { getChatsPath, getChatPath };
