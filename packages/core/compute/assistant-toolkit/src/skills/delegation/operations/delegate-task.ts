//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { trim } from '@dxos/util';

import { Chat } from '../../../types';
import { DelegateTask } from './definitions';

/**
 * Delegation is the promotion moment: the unit of work becomes a durable `Task` on the
 * conversation's checklist assigned to an agent (`role: 'assistant'`), which the supervisor's
 * reconcile loop picks up and marks done/failed on completion (see the delegation strategy).
 */
const handler: Operation.WithHandler<typeof DelegateTask> = DelegateTask.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ title }) {
      if (title.length === 0) {
        return yield* Effect.fail(new Error('Provide a non-empty task title.'));
      }

      const chat = yield* Chat.getFromContext;
      const { db } = yield* Database.Service;

      // Queued (`todo`) rather than `started`: the reconcile loop spawns the sub-agent and marks
      // the task started at spawn, so `started` always means a live process.
      const task = Chat.addTask(db, chat, title, {
        status: 'todo',
        assignee: { role: 'assistant' },
      });
      yield* Database.flush();

      return trim`
        Delegated "${task.title}" as a queued agent task (id: ${task.id}).
        Current checklist:
        <checklist>
          ${yield* Chat.formatChecklist(chat)}
        </checklist>
      `;
    }),
  ),
);

export default handler;
