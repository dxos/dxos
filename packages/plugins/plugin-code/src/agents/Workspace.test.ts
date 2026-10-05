//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Chat } from '@dxos/assistant';
import { Feed, Obj, Ref } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';

import * as Workspace from './Workspace.ts';

describe('Workspace', () => {
  test('a worktree key names the chat it belongs to', ({ expect }) => {
    const spaceId = SpaceId.random();
    const chatId = Obj.ID.random();
    expect(Workspace.parseWorktreeKey(`${spaceId}_${chatId}`)).toEqual({ spaceId, chatId });
    expect(Workspace.parseWorktreeKey('not-a-key')).toBeUndefined();
    expect(Workspace.parseWorktreeKey(`${spaceId}_${chatId}_extra`)).toBeUndefined();
  });

  test('a branch reads like the chat and stays unique to it', ({ expect }) => {
    const chat = Chat.make({ name: 'Fix the flaky test (again!)', feed: Ref.make(Feed.make()) });
    const branch = Workspace.branchName(chat);
    expect(branch).toBe(`composer/fix-the-flaky-test-again-${chat.id.slice(-8).toLowerCase()}`);

    const unnamed = Chat.make({ feed: Ref.make(Feed.make()) });
    expect(Workspace.branchName(unnamed)).toBe(`composer/${unnamed.id.slice(-8).toLowerCase()}`);
  });

  test('a recorded branch outlives a rename', ({ expect }) => {
    const chat = Chat.make({ feed: Ref.make(Feed.make()) });
    const first = Workspace.branchName(chat);
    Workspace.recordBranch(chat, first);
    Obj.update(chat, (chat) => {
      chat.name = 'Titled later';
    });
    expect(Workspace.branchName(chat)).toBe(first);
  });
});
