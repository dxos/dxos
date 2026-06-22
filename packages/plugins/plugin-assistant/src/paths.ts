//
// Copyright 2025 DXOS.org
//

import { AppNode, Paths } from '@dxos/app-toolkit';
import { Chat } from '@dxos/assistant-toolkit';
import { Type } from '@dxos/echo';

const chatTypename = Type.getTypename(Chat.Chat)!;

export const getChatsPath = (spaceId: string): string =>
  Paths.getSpacePath(spaceId, AppNode.NAV_TREE_GROUP_AI_ID, chatTypename);

export const getChatPath = (spaceId: string, objectId: string): string => `${getChatsPath(spaceId)}/${objectId}`;
