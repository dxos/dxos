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

/** Foreign-key source under which a chat records the branch its worktree is on. */
const BRANCH_KEY = 'git-branch';

/**
 * The branch a delegated chat works on: the one it recorded, else a new name readable from the chat's
 * name and unique by its id. Recorded because the chat's name changes (it is titled after its first
 * turn) and the branch holding its work must not.
 */
export const branchName = (chat: Chat.Chat): string => {
  const recorded = Obj.getKeys(chat, BRANCH_KEY).at(-1)?.id;
  if (recorded) {
    return recorded;
  }
  const slug = (chat.name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_SLUG)
    .replace(/^-+|-+$/g, '');
  const suffix = chat.id.slice(-8).toLowerCase();
  return `composer/${slug ? `${slug}-` : ''}${suffix}`;
};

/** Remembers the branch the chat's worktree is on; a folder that is not a repository has none. */
export const recordBranch = (chat: Chat.Chat, branch: string): void => {
  if (branch && Obj.getKeys(chat, BRANCH_KEY).at(-1)?.id !== branch) {
    Obj.update(chat, (chat) => {
      Obj.getMeta(chat).keys.push({ source: BRANCH_KEY, id: branch });
    });
  }
};
