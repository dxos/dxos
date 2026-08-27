//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Chat, type OperationInvoke, type SlashCommandResult, resolveSlashCommand } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import { Feed, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as TaskOperation from '@dxos/plugin-tasks/TaskOperation';
import { Task } from '@dxos/types';

import { TaskSlashCommands } from './task-commands';

/**
 * Records invocations instead of running them: `/task:run`'s effect is the `UpdateTask` call it
 * makes, and the verb's own behaviour is covered by plugin-tasks.
 */
const recordingInvoke = () => {
  const calls: { operation: Operation.Definition.Any; input: unknown }[] = [];
  const invoke: OperationInvoke = async (operation, ...args) => {
    calls.push({ operation, input: args[0] });
    return {};
  };
  return { calls, invoke };
};

describe('task slash commands', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({ types: [Chat.Chat, Feed.Feed, Task.Task] });
    const chat = db.add(Chat.make({ name: 'Test', feed: Ref.make(db.add(Feed.make())) }));
    await db.flush();
    const { calls, invoke } = recordingInvoke();

    /** Routes through `resolveSlashCommand`, so the tests exercise the same dispatch the prompt uses. */
    const run = async (text: string): Promise<SlashCommandResult | Error> => {
      const resolved = resolveSlashCommand(text, TaskSlashCommands);
      if (!resolved) {
        return new Error(`Not a task command: ${text}`);
      }
      return resolved.command.execute(resolved.args, { db, chat, invoke });
    };

    return { db, chat, calls, run };
  };

  const titles = (chat: Chat.Chat) => Chat.resolveTasks(chat).map((task) => task.title);

  test('/task:create appends to the checklist', async ({ expect }) => {
    const { chat, run } = await setup();

    expect(await run('/task:create Draft the plan')).toEqual({ summary: 'Created task “Draft the plan”.' });
    await run('/task:create Ship it');

    expect(titles(chat)).toEqual(['Draft the plan', 'Ship it']);
  });

  test('/task:create rejects an empty title', async ({ expect }) => {
    const { chat, run } = await setup();

    expect(await run('/task:create')).toBeInstanceOf(Error);
    expect(titles(chat)).toEqual([]);
  });

  test('/task:delete takes ordinals and quoted titles, and sweeps sub-tasks', async ({ expect }) => {
    const { db, chat, run } = await setup();

    const parent = Chat.addTask(db, chat, 'Ship the release');
    Chat.addTask(db, chat, 'Write the changelog', { parentTask: Ref.make(parent) });
    Chat.addTask(db, chat, 'Unrelated');
    Chat.addTask(db, chat, 'Also unrelated');
    await db.flush();

    // Ordinal 1 is the parent, so its sub-task goes with it even though nothing named the child.
    expect(await run('/task:delete 1')).toEqual({ summary: 'Deleted “Ship the release”.' });
    expect(titles(chat)).toEqual(['Unrelated', 'Also unrelated']);

    expect(await run('/task:delete "Also unrelated"')).toEqual({ summary: 'Deleted “Also unrelated”.' });
    expect(titles(chat)).toEqual(['Unrelated']);
  });

  test('/task:delete names a parent and its sub-task once each', async ({ expect }) => {
    const { db, chat, run } = await setup();

    const parent = Chat.addTask(db, chat, 'Parent');
    Chat.addTask(db, chat, 'Child', { parentTask: Ref.make(parent) });
    await db.flush();

    // The child is swept with the parent, so naming both must not report it twice.
    expect(await run('/task:delete 1 2')).toEqual({ summary: 'Deleted “Parent”.' });
    expect(titles(chat)).toEqual([]);
  });

  test('/task:delete reports an unmatched selector rather than deleting anything', async ({ expect }) => {
    const { db, chat, run } = await setup();

    Chat.addTask(db, chat, 'Only task');
    await db.flush();

    expect(await run('/task:delete 7')).toBeInstanceOf(Error);
    expect(await run('/task:delete')).toBeInstanceOf(Error);
    expect(titles(chat)).toEqual(['Only task']);
  });

  test('/task:run queues the named tasks through UpdateTask', async ({ expect }) => {
    const { db, chat, calls, run } = await setup();

    Chat.addTask(db, chat, 'Runnable');
    Chat.addTask(db, chat, 'Already done', { status: 'done' });
    await db.flush();

    const result = await run('/task:run 1');
    expect(result).not.toBeInstanceOf(Error);
    expect(calls).toHaveLength(1);
    expect(calls[0].operation).toBe(TaskOperation.UpdateTask);
    expect(calls[0].input).toMatchObject({ assignee: { role: 'assistant' }, status: 'todo' });
    // The follow-up is what wakes the conversation so the supervisor's reconcile spawns.
    expect(result).toHaveProperty('followUp');
  });

  test('/task:run skips a task with nothing left to run', async ({ expect }) => {
    const { db, chat, calls, run } = await setup();

    Chat.addTask(db, chat, 'Already done', { status: 'done' });
    await db.flush();

    expect(await run('/task:run 1')).toEqual({
      summary: 'Nothing to run: every named task is already done, cancelled, or running.',
    });
    expect(calls).toEqual([]);
  });
});
