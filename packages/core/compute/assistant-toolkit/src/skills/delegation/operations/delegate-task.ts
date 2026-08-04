//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { Outline } from '@dxos/types';
import { trim } from '@dxos/util';

import { Chat } from '../../../types';
import { DelegateTask } from './definitions';

/**
 * Delegation is the promotion moment: the scratch checklist item becomes a durable `Task`
 * (parented to the outline's task set) assigned to an agent (`role: 'assistant'`), which the
 * supervisor's reconcile loop picks up. The markdown line is checked off only when the sub-agent
 * completes (see the delegation strategy).
 */
const handler: Operation.WithHandler<typeof DelegateTask> = DelegateTask.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ title }) {
      if (title.length === 0) {
        return yield* Effect.fail(new Error('Provide a non-empty task title.'));
      }

      const chat = yield* Chat.getFromContext;
      const { outline, text } = yield* Chat.ensureOutlineText(chat);
      const { db } = yield* Database.Service;

      const task = yield* Effect.promise(() =>
        Outline.createTask(outline, db, title, {
          status: 'in-progress',
          assignee: { role: 'assistant' },
        }),
      );

      // Ensure the checklist carries the item (unchecked until the sub-agent completes).
      Obj.update(text, (text) => {
        text.content = Outline.upsertChecklistItems(text.content, [{ title: task.title, done: false }]);
      });
      yield* Database.flush();

      return trim`
        Delegated "${task.title}" as an in-progress agent task (id: ${task.id}).
        Current checklist:
        <checklist>
          ${text.content}
        </checklist>
      `;
    }),
  ),
);

export default handler;
