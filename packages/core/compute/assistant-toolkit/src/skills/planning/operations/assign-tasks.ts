//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Harness } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, type Ref } from '@dxos/echo';
import { Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { AssignTasks } from './definitions';

/**
 * Keeps only references that resolve to a task. `Ref.Ref(Task.Task)` decodes on ref shape alone —
 * a ref's target may not be loaded, so the schema cannot vouch for its type — and the checklist is
 * declared as task refs, so anything else reaching it would be handed back typed as a Task.
 */
const resolveTasks = (
  refs: readonly Ref.Ref<Task.Task>[],
): Effect.Effect<readonly Ref.Ref<Task.Task>[], never, Database.Service> =>
  Effect.forEach(refs, (ref) =>
    Database.load(ref).pipe(
      Effect.map((object) => (Obj.instanceOf(Task.Task, object) ? ref : undefined)),
      Effect.orElseSucceed(() => undefined),
    ),
  ).pipe(Effect.map((resolved) => resolved.filter((ref) => ref !== undefined)));

/**
 * Assigns existing tasks to the conversation's checklist and unassigns others. Membership only:
 * neither branch creates or destroys a task, so a task borrowed from a project's set survives being
 * dropped from this checklist.
 */
export default AssignTasks.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ add, remove }) {
      const chat = yield* Harness.getChat;

      const requested = add ?? [];
      const assignable = yield* resolveTasks(requested);

      // Removed first, so a payload naming the same task on both sides settles as "still assigned"
      // rather than dropping it. Removal takes the refs as given: dropping a member that is not a
      // task is a repair, not a corruption.
      const removed = Chat.unassignTasks(chat, remove ?? []);
      const added = Chat.assignTasks(chat, assignable);
      yield* Database.flush();

      const rejected = requested.length - assignable.length;
      return trim`
        Assigned ${added.length} task(s); unassigned ${removed.length};
        ${rejected > 0 ? `ignored ${rejected} reference(s) that do not resolve to a task.` : ''}

        <checklist>
          ${yield* Chat.formatChecklist(chat)}
        </checklist>
      `;
    }),
  ),
  Operation.opaqueHandler,
);
