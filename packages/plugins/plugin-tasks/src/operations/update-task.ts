//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Obj, Ref } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors.ts';
import { cascadeClaim, claimedAssignee } from './claim.ts';
import { assignToSession } from './session-assignee.ts';
import { requireOwner, validateAssignee, validateDelegate } from './validate-assignee.ts';

/** A plain copy, so a before/after comparison is not fooled by live proxies. */
const plain = <T>(value: T): T | undefined => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

/**
 * An actor as the output reports it: a copy that keeps its refs (`subject`, `contact`) as refs, which the output schema
 * requires; a JSON copy turns them into `{ "/": uri }` and fails it.
 */
const copyActor = <T extends object>(actor: T | undefined): T | null => (actor ? { ...actor } : null);

const differs = (before: unknown, after: unknown): boolean => JSON.stringify(before) !== JSON.stringify(after);

const handler: Operation.WithHandler<typeof TaskOperation.UpdateTask> = TaskOperation.UpdateTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      task: taskRef,
      title,
      description,
      status,
      priority,
      estimate,
      assignee,
      delegate,
      remoteSession,
      milestone,
      parentTask,
    }) {
      yield* validateAssignee(assignee);
      const task = yield* Database.load(taskRef);
      const taskSet =
        milestone !== undefined || parentTask !== undefined ? yield* TaskSet.findTaskSet(task) : undefined;

      // Compared by entity id: the same object may be addressed local or space-qualified.
      if (milestone) {
        const milestoneId = Task.refEntityId(milestone);
        const belongs = taskSet?.milestones.some((ref) => Task.refEntityId(ref) === milestoneId) ?? false;
        if (!belongs) {
          return yield* Effect.fail(
            new InvalidOperationInput({ message: 'The milestone does not belong to this task set.' }),
          );
        }
      }

      const newParent = parentTask ? yield* TaskSet.resolveParentTask(taskSet, task, parentTask) : undefined;

      const agentClaim = remoteSession !== undefined || delegate?.role === 'assistant';
      const answering = Task.owner(parentTask === undefined ? Task.getParentTask(task) : newParent);
      const claimed = agentClaim
        ? claimedAssignee(answering, assignee, { owned: Task.owner(task) !== undefined })
        : assignee;
      const next = Task.holders(task, { assignee: claimed, delegate });
      if (!remoteSession) {
        yield* validateDelegate(delegate, next.assignee);
      }
      if (
        remoteSession ||
        (next.delegate && !Task.isSubAgentRequest(delegate ?? undefined) && (claimed !== undefined || delegate != null))
      ) {
        yield* requireOwner(task.title, Task.owner(next));
      }
      const sessionDelegate = remoteSession
        ? yield* assignToSession(remoteSession, delegate ?? undefined, { defaultTitle: title ?? task.title })
        : undefined;

      // Through `Task.edit`, so the change and the log entry that explains it land together and a
      // no-op patch records nothing. Milestone stays here: it is set membership, not a field edit.
      const previousStatus = task.status;
      const before = {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        estimate: task.estimate,
        assignee: plain(task.assignee),
        delegate: plain(task.delegate),
        milestone: task.milestone?.uri,
        parentTask: Task.parentTaskId(task),
      };
      const historyLength = task.history?.length ?? 0;
      const previousDelegate = task.delegate && { ...task.delegate };
      Task.update(task, {
        title,
        description,
        status,
        priority,
        estimate,
        assignee: claimed,
        delegate: sessionDelegate ?? delegate,
      });
      if (task.status !== undefined && task.status !== previousStatus) {
        yield* Trace.write(Trace.TaskStatusChanged, {
          taskId: task.id,
          title: task.title,
          status: task.status,
          ...(previousStatus ? { previousStatus } : {}),
        });
      }

      if (milestone !== undefined) {
        Obj.update(task, (task) => {
          // Cleared with `delete`, not by assigning undefined: the property schema is optional
          // rather than nullable.
          if (milestone === null) {
            delete task.milestone;
          } else {
            task.milestone = milestone;
          }
        });
      }

      // Appended to its new parent's sub-tasks (or the set's roots); the set it belongs to is unchanged.
      if (parentTask !== undefined) {
        TaskSet.moveTask(taskSet, task, { parentTask: newParent ?? null });
      }

      // After any re-parent, so the cascade reaches the tree the task now belongs to.
      const requested = sessionDelegate ?? delegate;
      yield* cascadeClaim(task, {
        delegate: requested === undefined ? undefined : (task.delegate ?? (previousDelegate ? null : undefined)),
        previousDelegate,
        owner: Task.owner(task),
        started: status === 'started',
      });

      const parent = Task.getParentTask(task);
      const changed = {
        ...(differs(before.title, task.title) && { title: task.title }),
        ...(differs(before.description, task.description) && { description: task.description ?? null }),
        ...(differs(before.status, task.status) && { status: task.status }),
        ...(differs(before.priority, task.priority) && { priority: task.priority ?? null }),
        ...(differs(before.estimate, task.estimate) && { estimate: task.estimate ?? null }),
        ...(differs(before.assignee, task.assignee) && { assignee: copyActor(task.assignee) }),
        ...(differs(before.delegate, task.delegate) && { delegate: copyActor(task.delegate) }),
        ...(differs(before.milestone, task.milestone?.uri) && { milestone: task.milestone ?? null }),
        ...(differs(before.parentTask, parent?.id) && { parentTask: parent ? Ref.make(parent) : null }),
      };

      return {
        task: Ref.make(task),
        changed,
        historyEntry: task.history?.slice(historyLength).find(Task.isChangeEntry),
      };
    }),
  ),
);

export default handler;
