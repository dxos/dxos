//
// Copyright 2026 DXOS.org
//

import { Chat, type SlashCommand, parseTaskSelectors } from '@dxos/assistant-toolkit';
import { type Database, Ref } from '@dxos/echo';
import * as TaskOperation from '@dxos/plugin-tasks/TaskOperation';
import { type Task, TaskSet } from '@dxos/types';
import { trim } from '@dxos/util';

/**
 * The task shortcuts, bound to the task verbs.
 *
 * Each command invokes the operation the agent and the MCP surface call, rather than writing to
 * ECHO itself — `DeleteTask` sweeps a task's sub-tasks out of the set's membership array, and a
 * second implementation here would be the one that forgets to.
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

      await invoke(TaskOperation.CreateTask, { taskSet: Ref.make(taskSet), title }, { spaceId: db.spaceId });
      return { summary: `Created task “${title}”.` };
    },
  },
  {
    command: '/task:delete',
    description: 'Delete task(s) by number or title',
    execute: async (args, { db, chat, invoke }) => {
      const resolved = resolveTasks(args, db, chat);
      if (resolved instanceof Error) {
        return resolved;
      }
      if (resolved.length === 0) {
        return new Error('Usage: /task:delete <task number or title> [...]');
      }

      for (const task of resolved) {
        await invoke(TaskOperation.DeleteTask, { task: Ref.make(task) }, { spaceId: db.spaceId });
      }
      return { summary: summarize('Deleted', resolved) };
    },
  },
  {
    command: '/task:run',
    description: 'Delegate task(s) by number or title',
    execute: async (args, { db, chat, invoke }) => {
      const resolved = resolveTasks(args, db, chat);
      if (resolved instanceof Error) {
        return resolved;
      }
      if (resolved.length === 0) {
        return new Error('Usage: /task:run <task number or title> [...]');
      }

      // A terminal task has nothing left to run, and delegating a running one would fork it.
      const runnable = resolved.filter(
        (task) => task.status !== 'done' && task.status !== 'cancelled' && task.status !== 'started',
      );
      if (runnable.length === 0) {
        return { summary: 'Nothing to run: every named task is already done, cancelled, or running.' };
      }

      // Queue for the supervisor's reconcile — an agent assignee on a `todo` task is what it picks
      // up; `started` is stamped at spawn. `UpdateTask` is the only writer allowed to move these.
      for (const task of runnable) {
        await invoke(
          TaskOperation.UpdateTask,
          { task: Ref.make(task), assignee: { role: 'assistant' as const }, status: 'todo' as const },
          { spaceId: db.spaceId },
        );
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
      typeof selector === 'number'
        ? tasks[selector - 1]
        : tasks.find((candidate) => candidate.title === selector.trim());
    if (!task) {
      return new Error(`No matching task for: ${selector}. Select by 1-based number or exact title.`);
    }
    resolved.push(task);
  }
  return resolved;
};

const summarize = (verb: string, tasks: readonly Task.Task[]): string =>
  `${verb} ${tasks.map((task) => `“${task.title}”`).join(', ')}.`;
