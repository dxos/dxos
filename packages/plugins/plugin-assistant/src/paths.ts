//
// Copyright 2025 DXOS.org
//

import { Paths } from '@dxos/app-toolkit';
import { Chat } from '@dxos/assistant-toolkit';

const { getSectionPath: getChatsPath, getObjectPath: getChatPath } = Paths.createTypeSectionPaths(Chat.Chat, {
  groupId: Paths.GroupSegments.ai,
});

export { getChatPath, getChatsPath };
