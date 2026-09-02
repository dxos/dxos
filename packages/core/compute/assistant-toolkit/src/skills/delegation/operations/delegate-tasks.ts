//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { type Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { Chat } from '../../../types';
import { DelegateTasks } from './definitions';

/**
 * Delegates existing checklist tasks: each selected task is assigned to an agent and queued, and
 * the supervisor's reconcile loop spawns one sub-agent per task once its dependencies are done
 * (marking it started at spawn; done/failed on exit). Selectors are 1-based checklist ordinals or
 * exact titles, so the model can act on "task 2" as easily as on a name.
 */
const handler: Operation.WithHandler<typeof DelegateTasks> = DelegateTasks.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ tasks: selectors }) {
      if (selectors.length === 0) {
        return yield* Effect.fail(new Error('Select at least one task (ordinal or title).'));
      }

      const chat = yield* Chat.getFromContext;
      const all = yield* Chat.loadTasks(chat);
      if (all.length === 0) {
        return yield* Effect.fail(new Error('The conversation has no tasks to delegate.'));
      }

      const selected = new Map<string, Task.Task>();
      const unmatched: (string | number)[] = [];
      for (const selector of selectors) {
        const task =
          typeof selector === 'number'
            ? all[selector - 1]
            : all.find((candidate) => candidate.title === selector.trim());
        if (task) {
          selected.set(task.id, task);
        } else {
          unmatched.push(selector);
        }
      }
      if (unmatched.length > 0) {
        return yield* Effect.fail(
          new Error(`No matching task for: ${unmatched.join(', ')}. Select by 1-based ordinal or exact title.`),
        );
      }

      const skipped: string[] = [];
      let delegated = 0;
      for (const task of selected.values()) {
        // A terminal task has nothing left to run; delegating an already-running one would fork it.
        if (task.status === 'done' || task.status === 'cancelled' || task.status === 'started') {
          skipped.push(`"${task.title}" (${task.status})`);
          continue;
        }
        Obj.update(task, (task) => {
          task.assignee = { role: 'assistant' };
          task.status = 'todo';
        });
        delegated += 1;
      }
      yield* Database.flush();

      return trim`
        Delegated ${delegated} task(s) to sub-agents; each starts once its dependencies are done.
        ${skipped.length > 0 ? `Skipped: ${skipped.join(', ')}.` : ''}
        <checklist>
          ${yield* Chat.formatChecklist(chat)}
        </checklist>
      `;
    }),
  ),
);

export default handler;
