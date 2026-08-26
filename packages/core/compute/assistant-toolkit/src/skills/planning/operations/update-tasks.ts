//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { Outline } from '@dxos/types';
import { trim } from '@dxos/util';

import { Chat } from '../../../types';
import { UpdateTasks } from './definitions';

/**
 * Upserts tasks into the conversation's working task set, matched by title: an existing task's
 * status is updated in place, a new title becomes a durable task filed into the set.
 */
export default UpdateTasks.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ tasks }) {
      const chat = yield* Chat.getFromContext;
      const taskSet = yield* Chat.ensureTaskSet(chat);
      const { db } = yield* Database.Service;

      // Mutable copy: a payload naming the same new title twice must upsert its own creation.
      const existing = [...(yield* Chat.loadTasks(chat))];
      for (const { title, status } of tasks) {
        const task = existing.find((candidate) => candidate.title === title.trim());
        if (task) {
          Obj.update(task, (task) => {
            task.status = status;
          });
        } else {
          existing.push(Outline.addTask(db, taskSet, title, { status }));
        }
      }
      yield* Database.flush();

      return trim`
        You must update a task to 'done' when complete, and keep exactly one task in progress.
        Current checklist:
        <checklist>
          ${yield* Chat.formatChecklist(chat)}
        </checklist>
      `;
    }),
  ),
  Operation.opaqueHandler,
);
