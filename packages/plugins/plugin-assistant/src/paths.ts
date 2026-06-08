//
// Copyright 2025 DXOS.org
//

import { createTypeSectionPaths } from '@dxos/app-toolkit';
import { Chat } from '@dxos/assistant-toolkit';

const { getSectionPath: getChatsPath, getObjectPath: getChatPath } = createTypeSectionPaths(Chat.Chat);

export { getChatsPath, getChatPath };
