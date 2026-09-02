//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { trim } from '@dxos/util';

import { Chat } from '../../../types';
import { AssignTasks } from './definitions';

/**
 * Assigns existing tasks to the conversation's checklist and unassigns others. Membership only:
 * neither branch creates or destroys a task, so a task borrowed from a project's set survives being
 * dropped from this checklist.
 */
export default AssignTasks.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ add, remove }) {
      const chat = yield* Chat.getFromContext;

      // Removed first, so a payload naming the same task on both sides settles as "still assigned"
      // rather than dropping it.
      const removed = Chat.unassignTasks(chat, remove ?? []);
      const added = Chat.assignTasks(chat, add ?? []);
      yield* Database.flush();

      return trim`
        Assigned ${added.length} task(s), unassigned ${removed.length}.
        Current checklist:
        <checklist>
          ${yield* Chat.formatChecklist(chat)}
        </checklist>
      `;
    }),
  ),
  Operation.opaqueHandler,
);
