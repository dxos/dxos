//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import * as Trace from '@dxos/compute/Trace';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, RemoteSession, Task, TaskSet } from '@dxos/types';

import createTask from './create-task.ts';
import updateTask from './update-task.ts';

describe('update-task', () => {
  it.effect('patches only the provided fields', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      yield* Database.flush();
      const { task } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Draft',
        priority: 'low',
      });

      yield* updateTask.handler({ task: Ref.make(task), status: 'started', estimate: 'm' });

      expect(task.title).toBe('Draft');
      expect(task.priority).toBe('low');
      expect(task.status).toBe('started');
      expect(task.estimate).toBe('m');
    }).pipe(
      Effect.provide(Trace.writerLayerNoop),
      Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] })),
    ),
  );

  it.effect('assigns a coding-agent session by its harness id, creating the session record', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      yield* Database.flush();
      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Draft' });

      yield* updateTask.handler({
        task: Ref.make(task),
        status: 'started',
        remoteSession: { sessionId: 'session_abc', title: 'Draft the thing', branch: 'claude/draft' },
      });

      // The space did not hold this session, so claiming the work created it — an agent can assign
      // itself on its first call rather than registering separately first.
      const sessions = yield* Database.query(Filter.type(RemoteSession.RemoteSession)).run;
      expect(sessions).toHaveLength(1);
      expect(RemoteSession.getSessionId(sessions[0])).toBe('session_abc');
      expect(sessions[0].branch).toBe('claude/draft');

      // The actor is the session object itself, not a bare role: a check-in finds its open tasks by
      // this ref, and a role alone would not say which run holds the task.
      expect(task.assignee?.role).toBe('assistant');
      expect(Task.refEntityId(task.assignee!.subject!)).toBe(sessions[0].id);
    }).pipe(
      Effect.provide(Trace.writerLayerNoop),
      Effect.provide(
        TestDatabaseLayer({
          types: [Milestone.Milestone, RemoteSession.RemoteSession, Task.Task, TaskSet.TaskSet],
        }),
      ),
    ),
  );

  it.effect('reuses the session already recorded for that harness id', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      const existing = yield* Database.add(
        RemoteSession.make({ sessionId: 'session_abc', state: 'running', started: new Date().toISOString() }),
      );
      yield* Database.flush();
      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Draft' });

      yield* updateTask.handler({
        task: Ref.make(task),
        remoteSession: { sessionId: 'session_abc', title: 'Draft the thing' },
      });

      const sessions = yield* Database.query(Filter.type(RemoteSession.RemoteSession)).run;
      expect(sessions).toHaveLength(1);
      expect(Task.refEntityId(task.assignee!.subject!)).toBe(existing.id);
      // A session missing a title takes the one the caller named; a session that has one keeps it,
      // since the session reports its own state and this call is not that report.
      expect(existing.title).toBe('Draft the thing');
    }).pipe(
      Effect.provide(Trace.writerLayerNoop),
      Effect.provide(
        TestDatabaseLayer({
          types: [Milestone.Milestone, RemoteSession.RemoteSession, Task.Task, TaskSet.TaskSet],
        }),
      ),
    ),
  );

  it.effect('records what the patch changed, and nothing when it changed nothing', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      yield* Database.flush();
      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Draft' });
      // Seeded directly: `CreateTask` takes no status, and a patch to set one would itself be
      // logged, which is the very thing under test.
      Obj.update(task, (task) => {
        task.status = 'todo';
      });

      yield* updateTask.handler({
        task: Ref.make(task),
        status: 'done',
        assignee: { name: 'Scout', role: 'assistant' },
      });
      expect(task.history?.map((entry) => entry.description)).toEqual([
        'Status changed from todo to done. Assigned to Scout.',
      ]);

      // Re-applying the same patch is not an event: it left the task exactly as it was.
      yield* updateTask.handler({ task: Ref.make(task), status: 'done' });
      expect(task.history).toHaveLength(1);
    }).pipe(
      Effect.provide(Trace.writerLayerNoop),
      Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] })),
    ),
  );

  it.effect('clears an optional field with null', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      yield* Database.flush();
      const { task } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Draft',
        assignee: { name: 'Scout' },
      });

      // Without `null` the operation could set an assignee but never remove one, since `undefined`
      // means the patch does not mention the field.
      yield* updateTask.handler({ task: Ref.make(task), assignee: null });

      expect(task.assignee).toBeUndefined();
      expect(task.history?.at(-1)?.description).toEqual('Unassigned.');
    }).pipe(
      Effect.provide(Trace.writerLayerNoop),
      Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] })),
    ),
  );

  it.effect('clearing parentTask clears the lifecycle edge, not just the ref', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: parent } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Parent' });
      const { task: child } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Child',
        parentTask: Ref.make(parent),
      });
      expect(Obj.getParent(child)?.id).toBe(taskSet.id);

      yield* updateTask.handler({ task: Ref.make(child), parentTask: null });

      // Membership is untouched by promotion: the edge points at the set before and after.
      expect(child.parentTask).toBeUndefined();
      expect(Obj.getParent(child)?.id).toBe(taskSet.id);
    }).pipe(
      Effect.provide(Trace.writerLayerNoop),
      Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] })),
    ),
  );

  it.effect('clears the lifecycle edge for a task belonging to no set', () =>
    Effect.gen(function* () {
      // A task outside a task set has no parent to fall back to, so the edge must be cleared outright.
      const parent = yield* Database.add(Task.make({ title: 'Parent', status: 'todo' }));
      const child = yield* Database.add(Task.make({ [Obj.Parent]: parent, title: 'Child', status: 'todo' }));
      Obj.update(child, (child) => {
        child.parentTask = Ref.make(parent);
      });
      yield* Database.flush();

      yield* updateTask.handler({ task: Ref.make(child), parentTask: null });

      expect(child.parentTask).toBeUndefined();
      expect(Obj.getParent(child)).toBeUndefined();
    }).pipe(
      Effect.provide(Trace.writerLayerNoop),
      Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] })),
    ),
  );

  it.effect('refuses to re-parent a task under its own sub-task', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: parent } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Parent' });
      const { task: child } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Child',
        parentTask: Ref.make(parent),
      });

      const exit = yield* Effect.exit(updateTask.handler({ task: Ref.make(parent), parentTask: Ref.make(child) }));
      expect(exit._tag).toBe('Failure');
    }).pipe(
      Effect.provide(Trace.writerLayerNoop),
      Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] })),
    ),
  );

  it.effect('promotes a sub-task back to a root with a null parentTask', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: parent } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Parent' });
      const { task: child } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Child',
        parentTask: Ref.make(parent),
      });

      yield* updateTask.handler({ task: Ref.make(child), parentTask: null });

      expect(child.parentTask).toBeUndefined();
      expect(Obj.getParent(child)?.id).toBe(taskSet.id);
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([parent.id, child.id]);
    }).pipe(
      Effect.provide(Trace.writerLayerNoop),
      Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] })),
    ),
  );
});

/** Collects what the handler wrote to the trace, so a status change can be asserted on. */
const collectingTrace = (messages: Trace.Message[]) =>
  Trace.testTraceService().pipe(
    Layer.provide(
      Layer.succeed(Trace.TraceSink, {
        write: (message) => {
          messages.push(message);
        },
      }),
    ),
  );

const statusEvents = (messages: readonly Trace.Message[]) =>
  messages
    .flatMap((message) => message.events)
    .filter((event) => event.type === Trace.TaskStatusChanged.key)
    .map((event) => Schema.decodeUnknownSync(Trace.TaskStatusChanged.schema)(event.data));

describe('update-task tracing', () => {
  it.effect('traces a status change, and stays silent when the status is unchanged', () => {
    const messages: Trace.Message[] = [];
    return Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      yield* Database.flush();
      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Draft' });

      yield* updateTask.handler({ task: Ref.make(task), status: 'started' });
      // Only the status change is traced: a title edit moves nothing on the timeline.
      yield* updateTask.handler({ task: Ref.make(task), title: 'Draft v2' });
      yield* updateTask.handler({ task: Ref.make(task), status: 'started' });
      yield* updateTask.handler({ task: Ref.make(task), status: 'done' });

      expect(statusEvents(messages)).toEqual([
        { taskId: task.id, title: 'Draft', status: 'started', previousStatus: 'todo' },
        { taskId: task.id, title: 'Draft v2', status: 'done', previousStatus: 'started' },
      ]);
    }).pipe(
      Effect.provide(collectingTrace(messages)),
      Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] })),
    );
  });
});
