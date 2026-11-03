//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Obj } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors.ts';
import { cascadeClaim, claimedAssignee } from './claim.ts';
import { assignToSession } from './session-assignee.ts';
import { requireOwner, validateAssignee, validateDelegate } from './validate-assignee.ts';

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

      // An agent's claim (a session, or an agent named as delegate) on a step with no person of its own takes its
      // parent's, the parent it is moving under when the edit also re-parents it.
      const agentClaim = remoteSession !== undefined || delegate?.role === 'assistant';
      const answering = Task.owner(parentTask === undefined ? Task.getParentTask(task) : newParent);
      const claimed = agentClaim
        ? claimedAssignee(answering, assignee, { owned: Task.owner(task) !== undefined })
        : assignee;
      // Judged on the shape the edit leaves: an agent at work needs a person answering for the task.
      const next = Task.holders(task, { assignee: claimed, delegate });
      // A session supplies the subject itself, so only a bare actor is checked.
      if (!remoteSession) {
        yield* validateDelegate(delegate, next.assignee);
      }
      if (remoteSession || (next.delegate && (claimed !== undefined || delegate != null))) {
        yield* requireOwner(task.title, Task.owner(next));
      }
      // Resolved before the patch so the actor it produces is what `Task.update` writes, and so a
      // session that does not exist yet is created rather than dropping the delegation.
      const sessionDelegate = remoteSession
        ? yield* assignToSession(remoteSession, delegate ?? undefined, { defaultTitle: title ?? task.title })
        : undefined;

      // Through `Task.edit`, so the change and the log entry that explains it land together and a
      // no-op patch records nothing. Milestone stays here: it is set membership, not a field edit.
      const previousStatus = task.status;
      // A copy: the stored record is gone once the update hands the task back.
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
      // The resolved status, not the requested one: a task a person answers for lands in `review`. This is
      // what cuts an agent session's timeline into per-task segments.
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
      // What the write did, not what was asked: delegating to the task's own assignee is a hand-back.
      const requested = sessionDelegate ?? delegate;
      yield* cascadeClaim(task, {
        delegate: requested === undefined ? undefined : (task.delegate ?? (previousDelegate ? null : undefined)),
        previousDelegate,
        owner: Task.owner(task),
        started: status === 'started',
      });

      return { task: task };
    }),
  ),
);

export default handler;
