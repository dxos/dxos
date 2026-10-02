//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type { Chat } from '@dxos/assistant';
import * as Project from '@dxos/compute/Project';
import { Obj } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';

const SEPARATOR = '_';
const MAX_SLUG = 40;

/** The project a chat was opened under, whose folder it works in. */
export const projectOf = (chat: Chat.Chat): Project.Project | undefined => {
  const parent = Obj.getParent(chat);
  return parent && Obj.instanceOf(Project.Project, parent) ? parent : undefined;
};

/** Names the chat's worktree: its space and id, which is how a sweep finds the chat again. */
export const worktreeKey = (chat: Chat.Chat): string | undefined => {
  const spaceId = Obj.getDatabase(chat)?.spaceId;
  return spaceId ? `${spaceId}${SEPARATOR}${chat.id}` : undefined;
};

export const parseWorktreeKey = (key: string): { spaceId: SpaceId; chatId: string } | undefined => {
  const [spaceId, chatId, ...rest] = key.split(SEPARATOR);
  return spaceId && chatId && rest.length === 0 && SpaceId.isValid(spaceId) && Obj.ID.isValid(chatId)
    ? { spaceId, chatId }
    : undefined;
};

/** The branch a delegated chat works on: readable from its name, unique by its id. */
export const branchName = (chat: Chat.Chat): string => {
  const slug = (chat.name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_SLUG)
    .replace(/^-+|-+$/g, '');
  const suffix = chat.id.slice(-8).toLowerCase();
  return `composer/${slug ? `${slug}-` : ''}${suffix}`;
};
