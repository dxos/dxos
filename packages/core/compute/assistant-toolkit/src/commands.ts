//
// Copyright 2026 DXOS.org
//

import { type Database, Obj } from '@dxos/echo';
import { TaskSet } from '@dxos/types';
import { trim } from '@dxos/util';

import * as Chat from './types/Chat';

/**
 * A deterministic prompt shortcut: a leading `/command args` line executes directly — no model in
 * the loop — against the conversation's working task set, through the same primitives the task
 * operations use. Binding commands to operation invocations proper awaits a client-side harness
 * bridge (tracked in the project ledger), since harness-scoped operations resolve their services
 * only inside the agent session.
 */
export type SlashCommand = {
  /** Including the leading slash, e.g. `/run`. */
  command: string;
  /** Description surfaced in the prompt's completion list. */
  description: string;
  /** Executes against the conversation; an Error describes correct usage. */
  execute: (args: string, context: SlashCommandContext) => SlashCommandResult | Error;
};

export type SlashCommandContext = { db: Database.Database; chat: Chat.Chat };

export type SlashCommandResult = {
  /**
   * Prompt sent to the model after execution. Needed when the effect is driven by the supervisor
   * loop (delegation spawns on the post-turn reconcile), so the command must wake the
   * conversation; omitted when the result is already visible.
   */
  followUp?: string;
};

/** `"1 3"`, `"1,3"`, or titles — numeric tokens become 1-based ordinals. */
export const parseTaskSelectors = (args: string): (number | string)[] =>
  args
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((token) => (/^\d+$/.test(token) ? Number(token) : token));

export const SlashCommands: SlashCommand[] = [
  {
    command: '/task:run',
    description: 'Delegate task(s) by number or title',
    execute: (args, { db, chat }) => {
      const selectors = parseTaskSelectors(args);
      if (selectors.length === 0) {
        return new Error('Usage: /task:run <task number or title> [...]');
      }
      const taskSet = Chat.ensureTaskSetSync(db, chat);
      if (!taskSet) {
        return new Error('The task set is not loaded yet.');
      }
      const tasks = TaskSet.resolveTasks(taskSet);
      const delegatedTitles: string[] = [];
      for (const selector of selectors) {
        const task =
          typeof selector === 'number'
            ? tasks[selector - 1]
            : tasks.find((candidate) => candidate.title === selector.trim());
        if (!task) {
          return new Error(`No matching task for: ${selector}. Select by 1-based number or exact title.`);
        }
        // A terminal task has nothing left to run; delegating an already-running one would fork it.
        if (task.status === 'done' || task.status === 'cancelled' || task.status === 'started') {
          continue;
        }
        // Queue for the supervisor's reconcile: agent assignee + todo (started is stamped at spawn).
        Obj.update(task, (task) => {
          task.assignee = { role: 'assistant' };
          task.status = 'todo';
        });
        delegatedTitles.push(task.title);
      }
      return delegatedTitles.length > 0
        ? {
            followUp: trim`
              The user delegated EXACTLY these task(s) with the /task:run command: ${delegatedTitles.map((title) => `"${title}"`).join(', ')}.
              They are queued and will execute in the background. Acknowledge in one short
              sentence now, and when their completion is reported, acknowledge briefly and stop —
              the user scoped this run to those tasks only, so never delegate, start, or work on
              any other task.
            `,
          }
        : {};
    },
  },
  {
    command: '/task:create',
    description: 'Create a task',
    execute: (args, { db, chat }) => {
      const title = args.trim();
      if (title.length === 0) {
        return new Error('Usage: /task:create <description>');
      }
      const taskSet = Chat.ensureTaskSetSync(db, chat);
      if (!taskSet) {
        return new Error('The task set is not loaded yet.');
      }
      TaskSet.addTask(db, taskSet, title);
      return {};
    },
  },
  {
    command: '/task:delete',
    description: 'Delete task(s) by number',
    execute: (args, { db, chat }) => {
      const title = args.trim();
      if (title.length === 0) {
        return new Error('Usage: /task:delete <number>');
      }
      const taskSet = Chat.ensureTaskSetSync(db, chat);
      if (!taskSet) {
        return new Error('The task set is not loaded yet.');
      }
      const task = TaskSet.resolveTasks(taskSet)[Number(title) - 1];
      if (!task) {
        return new Error(`No matching task for: ${title}. Select by 1-based number.`);
      }
      // TODO(burdon): Invoke command to parse multiple numbers?
      TaskSet.deleteTask(db, taskSet, task);
      return {};
    },
  },
];

/**
 * Resolves a prompt into a slash command: `undefined` when the text is not a known command (it
 * falls through to the model).
 */
export const resolveSlashCommand = (text: string): { command: SlashCommand; args: string } | undefined => {
  if (!text.startsWith('/')) {
    return undefined;
  }
  const [name, ...rest] = text.split(/\s+/);
  const command = SlashCommands.find((candidate) => candidate.command === name);
  return command ? { command, args: rest.join(' ') } : undefined;
};
