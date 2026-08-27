//
// Copyright 2026 DXOS.org
//

import { Chat, type OperationInvoke, type SlashCommand, parseTaskSelectors } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import { type Database, Ref } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import * as TaskOperation from '@dxos/plugin-tasks/TaskOperation';
import { type Task, TaskSet } from '@dxos/types';
import { trim } from '@dxos/util';

/**
 * The task shortcuts. Each invokes the verb rather than writing to ECHO itself, because the verbs
 * carry semantics a second implementation would drop — `DeleteTask` sweeps a task's sub-tasks out
 * of the set's membership array.
 */
export const TaskSlashCommands: SlashCommand[] = [
  {
    command: '/task:create',
    description: 'Create a task',
    execute: async (args, { db, chat, invoke }) => {
      const title = args.trim();
      if (title.length === 0) {
        return new Error('Usage: /task:create <description>');
      }
      const taskSet = Chat.ensureTaskSetSync(db, chat);
      if (!taskSet) {
        return new Error('The task set is not loaded yet.');
      }

      const failure = await run(invoke, TaskOperation.CreateTask, { taskSet: Ref.make(taskSet), title }, db.spaceId);
      return failure ?? { summary: `Created task “${title}”.` };
    },
  },
  {
    command: '/task:delete',
    description: 'Delete task(s) by number or quoted title',
    execute: async (args, { db, chat, invoke }) => {
      const resolved = resolveTasks(args, db, chat);
      if (resolved instanceof Error) {
        return resolved;
      }
      if (resolved.length === 0) {
        return new Error('Usage: /task:delete <number | "exact title"> [...]');
      }

      for (const task of resolved) {
        const failure = await run(invoke, TaskOperation.DeleteTask, { task: Ref.make(task) }, db.spaceId);
        if (failure) {
          return failure;
        }
      }
      return { summary: summarize('Deleted', resolved) };
    },
  },
  {
    command: '/task:run',
    description: 'Delegate task(s) by number or quoted title',
    execute: async (args, { db, chat, invoke }) => {
      const resolved = resolveTasks(args, db, chat);
      if (resolved instanceof Error) {
        return resolved;
      }
      if (resolved.length === 0) {
        return new Error('Usage: /task:run <number | "exact title"> [...]');
      }

      // A terminal task has nothing left to run, and delegating a running one would fork it.
      const runnable = resolved.filter(
        (task) => task.status !== 'done' && task.status !== 'cancelled' && task.status !== 'started',
      );
      if (runnable.length === 0) {
        return { summary: 'Nothing to run: every named task is already done, cancelled, or running.' };
      }

      // An agent assignee on a `todo` task is what the supervisor's reconcile picks up.
      for (const task of runnable) {
        const failure = await run(
          invoke,
          TaskOperation.UpdateTask,
          {
            task: Ref.make(task),
            assignee: { role: 'assistant' as const },
            status: 'todo' as const,
          },
          db.spaceId,
        );
        if (failure) {
          return failure;
        }
      }

      return {
        summary: summarize('Delegated', runnable),
        followUp: trim`
          The user delegated EXACTLY these task(s) with the /task:run command: ${runnable.map((task) => `"${task.title}"`).join(', ')}.
          They are queued and will execute in the background. Acknowledge in one short
          sentence now, and when their completion is reported, acknowledge briefly and stop —
          the user scoped this run to those tasks only, so never delegate, start, or work on
          any other task.
        `,
      };
    },
  },
];

/**
 * `invokePromise` reports a handler failure in its result rather than by rejecting, so an
 * unexamined call reads as success and the command would claim an effect it never had.
 */
const run = async <I, O>(
  invoke: OperationInvoke,
  operation: Operation.Definition<I, O>,
  input: I,
  spaceId: SpaceId | undefined,
): Promise<Error | undefined> => {
  const { error } = await invoke(operation, input as never, { spaceId });
  return error;
};

/** Resolves selectors against the conversation's task set, in the order the user named them. */
const resolveTasks = (args: string, db: Database.Database, chat: Chat.Chat) => {
  const selectors = parseTaskSelectors(args);
  if (selectors.length === 0) {
    return [];
  }
  const taskSet = Chat.ensureTaskSetSync(db, chat);
  if (!taskSet) {
    return new Error('The task set is not loaded yet.');
  }

  const tasks = TaskSet.resolveTasks(taskSet);
  const resolved: Task.Task[] = [];
  for (const selector of selectors) {
    const task =
      'ordinal' in selector
        ? tasks[selector.ordinal - 1]
        : tasks.find((candidate) => candidate.title === selector.title.trim());
    if (!task) {
      const named = 'ordinal' in selector ? selector.ordinal : `"${selector.title}"`;
      return new Error(`No matching task for: ${named}. Select by 1-based number, or by exact title in quotes.`);
    }
    resolved.push(task);
  }
  return resolved;
};

const summarize = (verb: string, tasks: readonly Task.Task[]): string =>
  `${verb} ${tasks.map((task) => `“${task.title}”`).join(', ')}.`;
