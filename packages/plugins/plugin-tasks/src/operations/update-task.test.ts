//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { TestTraceService } from '@dxos/compute/testing';
import * as Trace from '@dxos/compute/Trace';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, RemoteSession, Task, TaskSet } from '@dxos/types';

import createTask from './create-task.ts';
import updateTask from './update-task.ts';

/** Who `whoami` names: the person a coding session works for. */
const owner = { name: 'Riley', identityDid: 'did:key:riley' };

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
      Effect.provide(
        Layer.provideMerge(
          Trace.writerLayerNoop,
          TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }),
        ),
      ),
    ),
  );

  it.effect('delegates to a coding-agent session by its harness id, creating the session record', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      yield* Database.flush();
      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Draft' });

      yield* updateTask.handler({
        task: Ref.make(task),
        status: 'started',
        assignee: owner,
        remoteSession: { sessionId: 'session_abc', title: 'Draft the thing', branch: 'claude/draft' },
      });

      // The space did not hold this session, so claiming the work created it — an agent can take
      // work on its first call rather than registering separately first.
      const sessions = yield* Database.query(Filter.type(RemoteSession.RemoteSession)).run;
      expect(sessions).toHaveLength(1);
      expect(RemoteSession.getSessionId(sessions[0])).toBe('session_abc');
      expect(sessions[0].branch).toBe('claude/draft');

      // The actor is the session object itself, not a bare role: a check-in finds its open tasks by
      // this ref, and a role alone would not say which run holds the task.
      expect(task.delegate?.role).toBe('assistant');
      expect(Task.refEntityId(task.delegate?.subject)).toBe(sessions[0].id);
      // The person behind the session answers for the task.
      expect(task.assignee?.identityDid).toBe(owner.identityDid);
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Trace.writerLayerNoop,
          TestDatabaseLayer({
            types: [Milestone.Milestone, RemoteSession.RemoteSession, Task.Task, TaskSet.TaskSet],
          }),
        ),
      ),
    ),
  );

  it.effect('names an untitled session after the task it claims, keeping a name it already has', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      const named = yield* Database.add(
        RemoteSession.make({
          sessionId: 'session_named',
          title: 'Own name',
          state: 'running',
          started: new Date().toISOString(),
        }),
      );
      yield* Database.flush();
      const { task: first } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Rotate the keys',
        assignee: owner,
      });
      const { task: second } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Backfill',
        assignee: owner,
      });

      yield* updateTask.handler({
        task: Ref.make(first),
        status: 'started',
        remoteSession: { sessionId: 'session_new' },
      });
      yield* updateTask.handler({ task: Ref.make(second), remoteSession: { sessionId: 'session_named' } });

      const [created] = yield* Database.query(
        Filter.foreignKeys(RemoteSession.RemoteSession, [RemoteSession.key('session_new')]),
      ).run;
      expect(created.title).toBe('Rotate the keys');
      expect(named.title).toBe('Own name');
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Trace.writerLayerNoop,
          TestDatabaseLayer({
            types: [Milestone.Milestone, RemoteSession.RemoteSession, Task.Task, TaskSet.TaskSet],
          }),
        ),
      ),
    ),
  );

  it.effect('refuses a session claim that leaves no person answering for the task', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      yield* Database.flush();
      const { task } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Draft',
        assignee: { role: 'assistant', name: 'Claude', identityDid: 'did:key:claude' },
      });

      const exit = yield* Effect.exit(
        updateTask.handler({ task: Ref.make(task), remoteSession: { sessionId: 'session_abc' } }),
      );

      expect(Exit.isFailure(exit)).toBe(true);
      expect(task.delegate).toBeUndefined();
      expect(yield* Database.query(Filter.type(RemoteSession.RemoteSession)).run).toEqual([]);

      // A claim refused for its move is refused before the session is recorded, too.
      const { task: parent } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Parent',
        assignee: owner,
      });
      const { task: child } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Child',
        parentTask: Ref.make(parent),
      });
      const moved = yield* Effect.exit(
        updateTask.handler({
          task: Ref.make(parent),
          parentTask: Ref.make(child),
          remoteSession: { sessionId: 'session_abc' },
        }),
      );
      expect(Exit.isFailure(moved)).toBe(true);
      expect(yield* Database.query(Filter.type(RemoteSession.RemoteSession)).run).toEqual([]);
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Trace.writerLayerNoop,
          TestDatabaseLayer({
            types: [Milestone.Milestone, RemoteSession.RemoteSession, Task.Task, TaskSet.TaskSet],
          }),
        ),
      ),
    ),
  );

  it.effect('a session claim names a person only for a task nobody answers for yet', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      yield* Database.flush();
      const { task } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Hire a roastery assistant',
        assignee: { name: 'Sam', identityDid: 'did:key:sam' },
      });

      yield* updateTask.handler({
        task: Ref.make(task),
        status: 'started',
        assignee: owner,
        remoteSession: { sessionId: 'session_claim' },
      });

      expect(task.assignee?.name).toBe('Sam');
      expect(task.delegate?.role).toBe('assistant');

      // Naming the session as delegate directly is the same claim.
      yield* updateTask.handler({
        task: Ref.make(task),
        assignee: owner,
        delegate: { role: 'assistant', name: 'Claude', identityDid: 'did:key:claude' },
      });
      expect(task.assignee?.name).toBe('Sam');

      // The session is the delegate whatever the caller passed; a person's fields are not the session's.
      yield* updateTask.handler({
        task: Ref.make(task),
        delegate: { role: 'user', ...owner },
        remoteSession: { sessionId: 'session_claim' },
      });
      expect(task.delegate?.role).toBe('assistant');
      expect(task.delegate?.identityDid).toBeUndefined();
      expect(task.delegate?.name).toBeUndefined();
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Trace.writerLayerNoop,
          TestDatabaseLayer({
            types: [Milestone.Milestone, RemoteSession.RemoteSession, Task.Task, TaskSet.TaskSet],
          }),
        ),
      ),
    ),
  );

  it.effect('refuses an edit that leaves an agent working with no person answering for the task', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      yield* Database.flush();
      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Draft', assignee: owner });
      const agent = { role: 'assistant' as const, name: 'Claude', identityDid: 'did:key:claude' };

      for (const claim of [
        { remoteSession: { sessionId: 'session_abc' }, assignee: null },
        { remoteSession: { sessionId: 'session_abc' }, assignee: agent },
        { delegate: agent, assignee: null },
      ]) {
        const exit = yield* Effect.exit(updateTask.handler({ task: Ref.make(task), ...claim }));
        expect(Exit.isFailure(exit)).toBe(true);
      }
      expect(task.assignee?.name).toBe('Riley');
      expect(task.delegate).toBeUndefined();

      yield* updateTask.handler({ task: Ref.make(task), delegate: agent });
      for (const edit of [{ assignee: null }, { assignee: { ...agent, name: 'Relay' } }]) {
        const exit = yield* Effect.exit(updateTask.handler({ task: Ref.make(task), ...edit }));
        expect(Exit.isFailure(exit)).toBe(true);
      }
      expect(task.assignee?.name).toBe('Riley');
      expect(task.delegate?.name).toBe('Claude');
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Trace.writerLayerNoop,
          TestDatabaseLayer({
            types: [Milestone.Milestone, RemoteSession.RemoteSession, Task.Task, TaskSet.TaskSet],
          }),
        ),
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
      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Draft', assignee: owner });

      yield* updateTask.handler({
        task: Ref.make(task),
        remoteSession: { sessionId: 'session_abc', title: 'Draft the thing' },
      });

      const sessions = yield* Database.query(Filter.type(RemoteSession.RemoteSession)).run;
      expect(sessions).toHaveLength(1);
      expect(Task.refEntityId(task.delegate?.subject)).toBe(existing.id);
      // A session missing a title takes the one the caller named; a session that has one keeps it,
      // since the session reports its own state and this call is not that report.
      expect(existing.title).toBe('Draft the thing');
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Trace.writerLayerNoop,
          TestDatabaseLayer({
            types: [Milestone.Milestone, RemoteSession.RemoteSession, Task.Task, TaskSet.TaskSet],
          }),
        ),
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
        assignee: { name: 'Scout', role: 'assistant', identityDid: 'did:key:scout' },
      });
      expect((task.history ?? []).filter(Task.isChangeEntry).map((entry) => entry.description)).toEqual([
        'Status changed from todo to done. Assigned to Scout.',
      ]);

      // Re-applying the same patch is not an event: it left the task exactly as it was.
      yield* updateTask.handler({ task: Ref.make(task), status: 'done' });
      expect(task.history).toHaveLength(1);
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Trace.writerLayerNoop,
          TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }),
        ),
      ),
    ),
  );

  it.effect('rejects an assignee that identifies no one', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      yield* Database.flush();
      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Draft' });

      const exit = yield* Effect.exit(updateTask.handler({ task: Ref.make(task), assignee: { name: 'Scout' } }));
      expect(exit._tag).toBe('Failure');
      expect(task.assignee).toBeUndefined();

      const created = yield* Effect.exit(
        createTask.handler({ taskSet: Ref.make(taskSet), title: 'Other', assignee: { email: 'scout@example.com' } }),
      );
      expect(created._tag).toBe('Failure');
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Trace.writerLayerNoop,
          TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }),
        ),
      ),
    ),
  );

  it.effect('clears an optional field with null', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      yield* Database.flush();
      const { task } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Draft',
        assignee: { name: 'Scout', identityDid: 'did:key:scout' },
      });

      // Without `null` the operation could set an assignee but never remove one, since `undefined`
      // means the patch does not mention the field.
      yield* updateTask.handler({ task: Ref.make(task), assignee: null });

      expect(task.assignee).toBeUndefined();
      expect((task.history ?? []).filter(Task.isChangeEntry).at(-1)?.description).toEqual('Unassigned.');
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Trace.writerLayerNoop,
          TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }),
        ),
      ),
    ),
  );

  it.effect('clearing parentTask moves the lifecycle edge to the set', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: parent } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Parent' });
      const { task: child } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Child',
        parentTask: Ref.make(parent),
      });
      expect(Obj.getParent(child)?.id).toBe(parent.id);

      yield* updateTask.handler({ task: Ref.make(child), parentTask: null });

      // Promotion hands the task to the set, so deleting the old parent no longer takes it along.
      expect(Task.getParentTask(child)).toBeUndefined();
      expect(Obj.getParent(child)?.id).toBe(taskSet.id);
      expect(parent.subtasks ?? []).toHaveLength(0);
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Trace.writerLayerNoop,
          TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }),
        ),
      ),
    ),
  );

  it.effect('clears the lifecycle edge for a task belonging to no set', () =>
    Effect.gen(function* () {
      // A task outside a task set has no parent to fall back to, so the edge must be cleared outright.
      const child = yield* Database.add(Task.make({ title: 'Child', status: 'todo' }));
      const parent = yield* Database.add(Task.make({ title: 'Parent', status: 'todo', subtasks: [Ref.make(child)] }));
      yield* Database.flush();
      expect(Task.parentTaskId(child)).toBe(parent.id);

      yield* updateTask.handler({ task: Ref.make(child), parentTask: null });

      expect(parent.subtasks ?? []).toHaveLength(0);
      expect(Obj.getParent(child)).toBeUndefined();
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Trace.writerLayerNoop,
          TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }),
        ),
      ),
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
      Effect.provide(
        Layer.provideMerge(
          Trace.writerLayerNoop,
          TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }),
        ),
      ),
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

      expect(Task.getParentTask(child)).toBeUndefined();
      expect(Obj.getParent(child)?.id).toBe(taskSet.id);
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([parent.id, child.id]);
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Trace.writerLayerNoop,
          TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }),
        ),
      ),
    ),
  );
});

describe('update-task subtree', () => {
  const layer = Layer.provideMerge(
    Trace.writerLayerNoop,
    TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }),
  );

  /** Two levels deep, so the cascade has to walk rather than look one level. */
  const makeTree = Effect.fnUntraced(function* () {
    const taskSet = yield* Database.add(TaskSet.make({}));
    yield* Database.flush();
    const { task: root } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Root' });
    const { task: child } = yield* createTask.handler({
      taskSet: Ref.make(taskSet),
      title: 'Child',
      parentTask: Ref.make(root),
    });
    const { task: grandchild } = yield* createTask.handler({
      taskSet: Ref.make(taskSet),
      title: 'Grandchild',
      parentTask: Ref.make(child),
    });
    const { task: other } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Other' });
    return { root, child, grandchild, other };
  });

  it.effect('delegating a sub-task delegates its whole tree', () =>
    Effect.gen(function* () {
      const { root, child, grandchild, other } = yield* makeTree();

      yield* updateTask.handler({
        task: Ref.make(child),
        assignee: owner,
        delegate: { role: 'assistant', name: 'agent', identityDid: 'did:key:agent' },
      });

      for (const member of [root, child, grandchild]) {
        expect(member.delegate?.name).toBe('agent');
        // Whoever answers for the task answers for its tree, so each member's finish waits on them.
        expect(member.assignee?.name).toBe('Riley');
        const changes = (member.history ?? []).filter(Task.isChangeEntry);
        expect(changes.at(-1)?.description).toContain('Delegated to');
      }
      // Delegation alone starts nothing.
      expect(root.status).toBe('todo');
      expect(other.delegate).toBeUndefined();
    }).pipe(Effect.provide(layer)),
  );

  it.effect("a session's claim on an unowned step of a person's tree answers to that person", () =>
    Effect.gen(function* () {
      const { root, child, grandchild } = yield* makeTree();
      yield* updateTask.handler({ task: Ref.make(root), assignee: { name: 'Sam', identityDid: 'did:key:sam' } });

      yield* updateTask.handler({
        task: Ref.make(child),
        status: 'started',
        assignee: owner,
        delegate: { role: 'assistant', name: 'agent', identityDid: 'did:key:agent' },
      });

      for (const member of [root, child, grandchild]) {
        expect(member.assignee?.name).toBe('Sam');
      }
    }).pipe(Effect.provide(layer)),
  );

  it.effect("a claim carries to each member its parent's person, an owned middle step included", () =>
    Effect.gen(function* () {
      const { root, child, grandchild } = yield* makeTree();
      yield* updateTask.handler({ task: Ref.make(child), assignee: { name: 'Sam', identityDid: 'did:key:sam' } });

      yield* updateTask.handler({
        task: Ref.make(root),
        assignee: owner,
        delegate: { role: 'assistant', name: 'agent', identityDid: 'did:key:agent' },
      });

      expect(root.assignee?.name).toBe('Riley');
      expect(child.assignee?.name).toBe('Sam');
      expect(grandchild.assignee?.name).toBe('Sam');

      // Claiming below the owned step answers to it, though the root above had nobody of its own.
      const { root: bare, child: middle, grandchild: below } = yield* makeTree();
      yield* updateTask.handler({ task: Ref.make(middle), assignee: { name: 'Sam', identityDid: 'did:key:sam' } });
      yield* updateTask.handler({
        task: Ref.make(below),
        assignee: owner,
        delegate: { role: 'assistant', name: 'agent', identityDid: 'did:key:agent' },
      });
      expect(below.assignee?.name).toBe('Sam');
      expect(bare.assignee?.name).toBe('Sam');
    }).pipe(Effect.provide(layer)),
  );

  it.effect("a claim that also re-parents answers to the person of the parent the task moves under", () =>
    Effect.gen(function* () {
      const { child, other } = yield* makeTree();
      yield* updateTask.handler({ task: Ref.make(child), assignee: { name: 'Sam', identityDid: 'did:key:sam' } });

      yield* updateTask.handler({
        task: Ref.make(other),
        parentTask: Ref.make(child),
        assignee: owner,
        delegate: { role: 'assistant', name: 'agent', identityDid: 'did:key:agent' },
      });

      expect(other.assignee?.name).toBe('Sam');
    }).pipe(Effect.provide(layer)),
  );

  it.effect("a session's later claim on a sub-task of its tree is accepted, and its finish waits on review", () =>
    Effect.gen(function* () {
      const { root, grandchild } = yield* makeTree();
      const session = { role: 'assistant' as const, name: 'agent', identityDid: 'did:key:agent' };
      yield* updateTask.handler({ task: Ref.make(root), assignee: owner, delegate: session });

      yield* updateTask.handler({ task: Ref.make(grandchild), delegate: session, status: 'done' });

      expect(grandchild.status).toBe('review');
    }).pipe(Effect.provide(layer)),
  );

  it.effect('handing a sub-task back hands its whole tree back', () =>
    Effect.gen(function* () {
      const { root, child, grandchild } = yield* makeTree();
      yield* updateTask.handler({
        task: Ref.make(root),
        assignee: owner,
        delegate: { role: 'assistant', name: 'agent', identityDid: 'did:key:agent' },
      });

      yield* updateTask.handler({ task: Ref.make(child), assignee: owner, delegate: null });

      for (const member of [root, child, grandchild]) {
        expect(member.delegate).toBeUndefined();
      }
    }).pipe(Effect.provide(layer)),
  );

  it.effect('delegating a sub-task to whoever answers for it hands its whole tree back', () =>
    Effect.gen(function* () {
      const { root, child, grandchild } = yield* makeTree();
      yield* updateTask.handler({ task: Ref.make(grandchild), assignee: { name: 'Sam', identityDid: 'did:key:sam' } });
      yield* updateTask.handler({
        task: Ref.make(root),
        assignee: owner,
        delegate: { role: 'assistant', name: 'agent', identityDid: 'did:key:agent' },
      });

      yield* updateTask.handler({ task: Ref.make(child), delegate: owner });

      for (const member of [root, child, grandchild]) {
        expect(member.delegate).toBeUndefined();
      }
    }).pipe(Effect.provide(layer)),
  );

  it.effect("a claim on a tree leaves an agent's own sub-task to it", () =>
    Effect.gen(function* () {
      const { root, grandchild } = yield* makeTree();
      const own = { role: 'assistant' as const, name: 'Scout', identityDid: 'did:key:scout' };
      yield* updateTask.handler({ task: Ref.make(grandchild), assignee: own });

      yield* updateTask.handler({
        task: Ref.make(root),
        assignee: owner,
        delegate: { role: 'assistant', name: 'agent', identityDid: 'did:key:agent' },
      });

      expect(grandchild.assignee?.name).toBe('Scout');
      expect(grandchild.delegate).toBeUndefined();
    }).pipe(Effect.provide(layer)),
  );

  it.effect('starting a sub-task starts its unstarted tree, leaving finished members alone', () =>
    Effect.gen(function* () {
      const { root, child, grandchild, other } = yield* makeTree();
      yield* updateTask.handler({ task: Ref.make(child), status: 'done' });

      yield* updateTask.handler({ task: Ref.make(grandchild), status: 'started' });

      expect(grandchild.status).toBe('started');
      expect(root.status).toBe('started');
      expect(child.status).toBe('done');
      expect(other.status).toBe('todo');
    }).pipe(Effect.provide(layer)),
  );

  it.effect('finishing a root finishes only the root', () =>
    Effect.gen(function* () {
      const { root, child, grandchild } = yield* makeTree();
      yield* updateTask.handler({ task: Ref.make(child), status: 'started' });

      yield* updateTask.handler({ task: Ref.make(root), status: 'done' });

      expect(root.status).toBe('done');
      expect(child.status).toBe('started');
      expect(grandchild.status).toBe('started');
    }).pipe(Effect.provide(layer)),
  );
});

describe('update-task tracing', () => {
  it.effect(
    'traces a status change, and stays silent when the status is unchanged',
    Effect.fnUntraced(
      function* () {
        const taskSet = yield* Database.add(TaskSet.make({}));
        yield* Database.flush();
        const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Draft' });

        yield* updateTask.handler({ task: Ref.make(task), status: 'started' });
        // Only the status change is traced: a title edit moves nothing on the timeline.
        yield* updateTask.handler({ task: Ref.make(task), title: 'Draft v2' });
        yield* updateTask.handler({ task: Ref.make(task), status: 'started' });
        yield* updateTask.handler({ task: Ref.make(task), status: 'done' });

        const events = yield* TestTraceService.events;
        expect(statusEvents(events)).toEqual([
          { taskId: task.id, title: 'Draft', status: 'started', previousStatus: 'todo' },
          { taskId: task.id, title: 'Draft v2', status: 'done', previousStatus: 'started' },
        ]);
      },
      Effect.provide(
        Layer.provideMerge(
          TestTraceService.layer,
          TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }),
        ),
      ),
    ),
  );
});

const statusEvents = (events: readonly Trace.FlatEvent[]) =>
  events
    .filter((event) => event.type === Trace.TaskStatusChanged.key)
    .map((event) => Schema.decodeUnknownSync(Trace.TaskStatusChanged.schema)(event.data));
