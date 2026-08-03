//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { Outline } from '@dxos/types';
import { trim } from '@dxos/util';

import { Chat } from '../../../types';
import { UpdateTasks } from './definitions';

/**
 * Upserts checklist items into the conversation's working outline (markdown `- [ ]` lines,
 * matched by title). The outline is the cheap, fluid form of work — durable Task objects are
 * created by promotion/delegation, not here.
 */
export default UpdateTasks.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ tasks }) {
      const chat = yield* Chat.getFromContext;
      const { text } = yield* Chat.ensureOutlineText(chat);

      Obj.update(text, (text) => {
        text.content = Outline.upsertChecklistItems(
          text.content,
          tasks.map(({ title, status }) => ({ title, done: status === 'done' })),
        );
      });

      return trim`
        You must update a task to 'done' when complete, and keep exactly one task in progress.
        Current checklist:
        <checklist>
          ${text.content}
        </checklist>
      `;
    }),
  ),
  Operation.opaqueHandler,
);
