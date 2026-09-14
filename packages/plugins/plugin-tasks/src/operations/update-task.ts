//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Actor, RemoteSession, Task, TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors.ts';

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
      remoteSession,
      milestone,
      parentTask,
    }) {
      const task = yield* Database.load(taskRef);
      // Resolved before the patch so the actor it produces is what `Task.update` writes, and so a
      // session that does not exist yet is created rather than dropping the assignment.
      const sessionAssignee = remoteSession ? yield* assignToSession(remoteSession, assignee ?? undefined) : undefined;
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

      // Through `Task.edit`, so the change and the log entry that explains it land together and a
      // no-op patch records nothing. Milestone stays here: it is set membership, not a field edit.
      const previousStatus = task.status;
      Task.update(task, { title, description, status, priority, estimate, assignee: sessionAssignee ?? assignee });
      // The resolved status, not the requested one: a task with reviewers lands in `review`. This is
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

      // Set membership is untouched — the task never left; only its place in the tree moved.
      if (parentTask !== undefined) {
        TaskSet.applyParentTask(taskSet, task, newParent);
      }

      return { task: task };
    }),
  ),
);

/**
 * The actor for a coding-agent session, creating the session record when the space does not hold
 * one for that harness id yet.
 *
 * An agent's actor is the object it IS, so the assignee carries a `subject` ref to the session: a
 * bare `{ role: 'assistant' }` says an assistant owns the task but not WHICH run, and a session's
 * own check-in (`RecordSession`) lists its open tasks by matching that ref. Any fields the caller
 * passed in `assignee` are kept — the session decides the subject, not the rest of the actor.
 */
const assignToSession = Effect.fnUntraced(function* (
  { sessionId, ...props }: { sessionId: string; title?: string; repo?: string; branch?: string; worktree?: string },
  assignee: Actor.Actor | undefined,
) {
  const { db } = yield* Database.Service;
  const matches = yield* Database.query(Filter.foreignKeys(RemoteSession.RemoteSession, [RemoteSession.key(sessionId)]))
    .run;
  // Oldest id wins, as `RecordSession` resolves a tie: nothing enforces uniqueness, so two writers
  // racing a first report can both create a row.
  const [existing] = [...matches].sort((left, right) => left.id.localeCompare(right.id));
  const session =
    existing ??
    db.add(
      RemoteSession.make({
        sessionId,
        state: 'running',
        started: new Date().toISOString(),
        lastCheckedIn: new Date().toISOString(),
        ...props,
      }),
    );

  // Fields the caller named are filled in on a session that lacks them; an existing value stands,
  // since the session itself reports its own state and this call is not that report.
  Obj.update(session, (session) => {
    session.title ??= props.title;
    session.repo ??= props.repo;
    session.branch ??= props.branch;
    session.worktree ??= props.worktree;
  });

  return { role: 'assistant' as const, ...assignee, subject: Ref.make(session) };
});

export default handler;
