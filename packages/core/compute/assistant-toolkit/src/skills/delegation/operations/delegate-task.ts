//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Harness } from '@dxos/assistant';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Outline } from '@dxos/types';
import { trim } from '@dxos/util';

import { Chat } from '../../../types';

export const DelegateTask = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.delegation.delegateTask'),
    name: 'Delegate task',
    description: trim`
      Delegate a unit of work to a sub-agent.
      Promotes the titled checklist item to a durable in-progress task assigned to an agent, so
      the supervisor spawns a background sub-agent. Creates the checklist item if absent.
    `,
    icon: 'ph--share-network--regular',
  },
  input: Schema.Struct({
    title: Schema.String.annotations({
      description: 'Title of the work to delegate (matched against the checklist, created if new).',
    }),
  }),
  output: Schema.Any,
  services: [Harness.HarnessService, Database.Service],
});

/**
 * Delegation is the promotion moment: the scratch checklist item becomes a durable `Task`
 * (parented to the outline's task set) assigned to an agent (`role: 'assistant'`), which the
 * supervisor's reconcile loop picks up. The markdown line is checked off only when the sub-agent
 * completes (see the delegation strategy).
 */
export default DelegateTask.pipe(
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
