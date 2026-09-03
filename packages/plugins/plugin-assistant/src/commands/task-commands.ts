//
// Copyright 2026 DXOS.org
//

import { type OperationInvoke, type SlashCommand, parseTaskSelectors } from '@dxos/assistant-toolkit';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Ref } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import * as TaskOperation from '@dxos/plugin-tasks/TaskOperation';
import { type Task } from '@dxos/types';
import { trim } from '@dxos/util';

/** Membership writes go through the `Chat` primitives because the chat, not a `TaskSet`, is the container. */
export const TaskSlashCommands: SlashCommand[] = [
  {
    command: '/task:create',
    description: 'Create a task',
    execute: async (args, { db, chat }) => {
      const title = args.trim();
      if (title.length === 0) {
        return new Error('Usage: /task:create <description>');
      }
      Chat.addTask(db, chat, title);
      await db.flush();
      return { summary: `Created task “${title}”.` };
    },
  },
  {
    command: '/task:delete',
    description: 'Delete task(s) by number or quoted title',
    execute: async (args, { db, chat }) => {
      const tasks = await hydrate(chat);
      const resolved = resolveSelectors(args, tasks);
      if (resolved instanceof Error) {
        return resolved;
      }
      if (resolved.length === 0) {
        return new Error('Usage: /task:delete <number | "exact title"> [...]');
      }

      // Sub-tasks go with their parent, so a later selector may already have been swept.
      const deleted: Task.Task[] = [];
      const seen = new Set<string>();
      for (const task of resolved) {
        if (seen.has(task.id)) {
          continue;
        }
        for (const member of Chat.deleteTask(db, chat, tasks, task)) {
          seen.add(member.id);
        }
        deleted.push(task);
      }
      await db.flush();
      return { summary: summarize('Deleted', deleted) };
    },
  },
  {
    command: '/task:run',
    description: 'Delegate task(s) by number or quoted title',
    execute: async (args, { db, chat, invoke }) => {
      const resolved = resolveSelectors(args, await hydrate(chat));
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

/**
 * The checklist in full: a reopened chat's refs are unresolved until loaded, and an unresolved
 * entry is invisible to both selector matching and the subtree sweep.
 */
const hydrate = async (chat: Chat.Chat): Promise<Task.Task[]> => {
  // `tryLoad`, not `load`: the latter throws on an entry whose object is gone, failing the whole
  // command instead of proceeding with the tasks that do resolve.
  await Promise.all(chat.tasks.map((ref) => ref.tryLoad()));
  return Chat.resolveTasks(chat);
};

/** Resolves selectors against `tasks`, in the order the user named them. */
const resolveSelectors = (args: string, tasks: readonly Task.Task[]) => {
  const selectors = parseTaskSelectors(args);
  if (selectors.length === 0) {
    return [];
  }

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
