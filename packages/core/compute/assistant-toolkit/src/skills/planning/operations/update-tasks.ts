//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Harness } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database } from '@dxos/echo';
import { Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { UpdateTasks } from './definitions.ts';

/**
 * Upserts tasks onto the conversation's checklist, matched by title: an existing task's status is
 * updated in place, a new title becomes a durable task appended to the chat.
 */
export default UpdateTasks.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ tasks }) {
      const chat = yield* Harness.getChat;
      const { db } = yield* Database.Service;

      // Mutable copy: a payload naming the same new title twice must upsert its own creation.
      const existing = [...(yield* Chat.loadTasks(chat))];
      for (const { title, status } of tasks) {
        const task = existing.find((candidate) => candidate.title === title.trim());
        if (task) {
          const previousStatus = task.status;
          // A task someone was named to review lands in `review` rather than closing; the rule is
          // `Task.update`'s, since the model naming `done` cannot know about reviewers.
          Task.setStatus(task, status);
          // The resolved status, not the requested one: a reviewed task lands in `review`.
          if (task.status !== undefined && task.status !== previousStatus) {
            yield* Trace.write(Trace.TaskStatusChanged, {
              taskId: task.id,
              title: task.title,
              status: task.status,
              ...(previousStatus ? { previousStatus } : {}),
            });
          }
        } else {
          const created = Chat.addTask(db, chat, title, { status });
          existing.push(created);
          if (created.status !== undefined) {
            yield* Trace.write(Trace.TaskStatusChanged, {
              taskId: created.id,
              title: created.title,
              status: created.status,
            });
          }
        }
      }
      yield* Database.flush();

      return trim`
        You must update a task to 'done' when complete, and keep exactly one task in progress.

        <checklist>
        ${yield* Chat.formatChecklist(chat)}
        </checklist>
      `;
    }),
  ),
  Operation.opaqueHandler,
);
