//
// Copyright 2025 DXOS.org
//

import { Chat } from '@dxos/assistant-toolkit';
import { createTypeSectionPaths } from '@dxos/app-toolkit';

const { getSectionPath: getChatsPath, getObjectPath: getChatPath } = createTypeSectionPaths(Chat.Chat);

export { getChatsPath, getChatPath };
