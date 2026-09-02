//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Harness } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { UpdateTasks } from './definitions';

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
          // A task someone was named to review lands in `review` rather than closing; the rule is
          // `Task.update`'s, since the model naming `done` cannot know about reviewers.
          Task.setStatus(task, status);
        } else {
          existing.push(Chat.addTask(db, chat, title, { status }));
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
