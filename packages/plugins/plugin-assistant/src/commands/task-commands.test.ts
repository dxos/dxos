//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Chat, type OperationInvoke, type SlashCommandResult, resolveSlashCommand } from '@dxos/assistant-toolkit';
import { Feed, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Task } from '@dxos/types';

import { TaskSlashCommands } from './task-commands.ts';

describe('task slash commands', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('/task:create appends to the checklist', async ({ expect }) => {
    const { chat, run } = await setup(builder);

    expect(await run('/task:create Draft the plan')).toEqual({ summary: 'Created task “Draft the plan”.' });
    await run('/task:create Ship it');

    expect(titles(chat)).toEqual(['Draft the plan', 'Ship it']);
  });

  test('/task:create rejects an empty title', async ({ expect }) => {
    const { chat, run } = await setup(builder);

    expect(await run('/task:create')).toBeInstanceOf(Error);
    expect(titles(chat)).toEqual([]);
  });

  test('/task:delete takes ordinals and quoted titles, and sweeps sub-tasks', async ({ expect }) => {
    const { db, chat, run } = await setup(builder);

    const parent = Chat.addTask(db, chat, 'Ship the release');
    Chat.addTask(db, chat, 'Write the changelog', { parentTask: Ref.make(parent) });
    Chat.addTask(db, chat, 'Unrelated');
    Chat.addTask(db, chat, 'Also unrelated');
    await db.flush();

    // Ordinal 1 is the parent, so its sub-task goes with it even though nothing named the child —
    // every member's parent edge is the chat, so the database cascade cannot reach it.
    expect(await run('/task:delete 1')).toEqual({ summary: 'Deleted “Ship the release”.' });
    expect(titles(chat)).toEqual(['Unrelated', 'Also unrelated']);

    expect(await run('/task:delete "Also unrelated"')).toEqual({ summary: 'Deleted “Also unrelated”.' });
    expect(titles(chat)).toEqual(['Unrelated']);
  });

  test('/task:delete names a parent and its sub-task once each', async ({ expect }) => {
    const { db, chat, run } = await setup(builder);

    const parent = Chat.addTask(db, chat, 'Parent');
    Chat.addTask(db, chat, 'Child', { parentTask: Ref.make(parent) });
    await db.flush();

    // The child is swept with the parent, so naming both must not report it twice.
    expect(await run('/task:delete 1 2')).toEqual({ summary: 'Deleted “Parent”.' });
    expect(titles(chat)).toEqual([]);
  });

  test('a dangling checklist entry does not fail the command', async ({ expect }) => {
    const { db, chat, run } = await setup(builder);

    Chat.addTask(db, chat, 'Still here');
    const gone = Chat.addTask(db, chat, 'Removed behind the array');
    await db.flush();
    // Removed without sweeping the array, so its entry can no longer resolve — `load` would throw
    // and take the whole command with it.
    db.remove(gone);
    await db.flush();

    expect(await run('/task:delete 1')).toEqual({ summary: 'Deleted “Still here”.' });
  });

  test('/task:delete reports an unmatched selector rather than deleting anything', async ({ expect }) => {
    const { db, chat, run } = await setup(builder);

    Chat.addTask(db, chat, 'Only task');
    await db.flush();

    expect(await run('/task:delete 7')).toBeInstanceOf(Error);
    expect(await run('/task:delete')).toBeInstanceOf(Error);
    expect(titles(chat)).toEqual(['Only task']);
  });
});

/** The commands under test never invoke an operation, so a call is a regression rather than a case. */
const unexpectedInvoke: OperationInvoke = async () => {
  throw new Error('Unexpected operation invocation.');
};

const setup = async (builder: EchoTestBuilder) => {
  const { db } = await builder.createDatabase({ types: [Chat.Chat, Feed.Feed, Task.Task] });
  const chat = db.add(Chat.make({ name: 'Test', feed: Ref.make(db.add(Feed.make())) }));
  await db.flush();

  /** Routes through `resolveSlashCommand`, so the tests exercise the prompt's own dispatch. */
  const run = async (text: string): Promise<SlashCommandResult | Error> => {
    const resolved = resolveSlashCommand(text, TaskSlashCommands);
    if (!resolved) {
      return new Error(`Not a task command: ${text}`);
    }
    return resolved.command.execute(resolved.args, { db, chat, invoke: unexpectedInvoke });
  };

  return { db, chat, run };
};

const titles = (chat: Chat.Chat) => Chat.resolveTasks(chat).map((task) => task.title);
