//
// Copyright 2025 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Chat from '@dxos/assistant/Chat';

const { getSectionPath: getChatsPath, getObjectPath: getChatPath } = GraphPath.createTypeSectionPaths(Chat.Chat, {
  groupId: GraphPath.GroupSegments.ai,
});

export { getChatPath, getChatsPath };
