//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Harness } from '@dxos/assistant';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Obj, Ref } from '@dxos/echo';
import { type Actor, Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { UpdateTasksError } from '../../../errors.ts';
import { type TaskChange, UpdateTasks } from './definitions.ts';

/**
 * The actor for the agent running this conversation: its `Agent` when the chat has one, otherwise
 * the chat itself, since a plain chat's conversation is the only session object there is. The
 * `subject` ref is what tells a self-assignment apart from a delegation (`{ role: 'assistant' }`
 * with no subject), which the supervisor would otherwise treat as a sub-agent task.
 */
export const selfActor = (chat: Chat.Chat): Effect.Effect<Actor.Actor> =>
  Effect.map(Agent.loadForChat(chat), (agent) => ({ role: 'assistant', subject: Ref.make(agent ?? chat) }));

/** Why a change cannot be applied as written, or undefined when its fields combine. */
const shapeError = ({ task, create, assign, unassign, title, status }: TaskChange): string | undefined => {
  if (create && task) {
    return 'set either `task` or `create`, not both';
  }
  if (!create && !task) {
    return 'name an existing `task`, or set `create` to make a new one';
  }
  if (create && !title?.trim()) {
    return '`create` needs a `title`';
  }
  if (assign && unassign) {
    return '`assign` and `unassign` contradict each other';
  }
  if (unassign && (create || status === 'started')) {
    return 'a task you create or start is assigned to you, so it cannot also be unassigned';
  }
  return undefined;
};

type Resolved = { change: TaskChange; task?: Task.Task };

/**
 * Creates, edits, assigns and unassigns the conversation's tasks. Every change is checked before any
 * is applied, so a malformed batch writes nothing and the model can resend it whole.
 *
 * Assignment always moves both halves together — the chat's checklist and the task's assignee — so
 * the checklist a conversation shows is the work its agent holds. Starting a task assigns it.
 */
export default UpdateTasks.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ changes }) {
      const chat = yield* Harness.getChat;
      const { db } = yield* Database.Service;
      const self = yield* selfActor(chat);

      const errors: string[] = [];
      const resolved: Resolved[] = [];
      for (const [index, change] of changes.entries()) {
        const error = shapeError(change);
        if (error) {
          errors.push(`change ${index + 1}: ${error}`);
          continue;
        }
        if (!change.task) {
          resolved.push({ change });
          continue;
        }
        // The schema decodes a ref on shape alone — its target may not be loaded — so the type is
        // checked here, where a ref to some other object would otherwise be handed back as a task.
        const target = yield* Database.load(change.task).pipe(Effect.orElseSucceed(() => undefined));
        if (!target || !Obj.instanceOf(Task.Task, target)) {
          errors.push(`change ${index + 1}: ${change.task.uri} is not a task`);
          continue;
        }
        resolved.push({ change, task: target });
      }

      if (errors.length > 0) {
        return yield* Effect.fail(
          new UpdateTasksError(trim`
            No changes were applied. Fix these and resend the whole batch:
            ${errors.join('\n')}

            <checklist>
            ${yield* Chat.formatChecklist(chat)}
            </checklist>
          `),
        );
      }

      for (const { change, task } of resolved) {
        const { title, status, assign, unassign } = change;
        if (!task) {
          // A task the conversation creates is its own work, so it starts out assigned.
          const created = Chat.addTask(db, chat, title ?? '', { status: status ?? 'todo', assignee: self });
          yield* Trace.write(Trace.TaskStatusChanged, {
            taskId: created.id,
            title: created.title,
            status: created.status ?? 'todo',
          });
          continue;
        }

        const assigning = assign || status === 'started';
        const previousStatus = task.status;
        // Through `Task.update`, so the edit and its history entry land together, and a task someone
        // was named to review lands in `review` rather than closing on the model's `done`.
        Task.update(task, {
          title: title?.trim(),
          status,
          ...(assigning ? { assignee: self } : unassign ? { assignee: null } : {}),
        });
        if (assigning) {
          Chat.assignTasks(chat, [Ref.make(task)]);
        } else if (unassign) {
          Chat.unassignTasks(chat, [Ref.make(task)]);
        }

        // The resolved status, not the requested one: a reviewed task lands in `review`.
        if (task.status !== undefined && task.status !== previousStatus) {
          yield* Trace.write(Trace.TaskStatusChanged, {
            taskId: task.id,
            title: task.title,
            status: task.status,
            ...(previousStatus ? { previousStatus } : {}),
          });
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
