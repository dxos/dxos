//
// Copyright 2026 DXOS.org
//

import { describe, expect, it, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Blob, Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { EntityId } from '@dxos/echo/Key';

import * as File from './File.ts';
import * as Milestone from './Milestone.ts';
import * as Task from './Task.ts';

/** A task's change entries — the ones that carry a `description`. */
const changes = (task: Task.Task): Task.ChangeEntry[] => (task.history ?? []).filter(Task.isChangeEntry);

/**
 * The derived views are the whole point of the flat-array model — hierarchy, milestone grouping,
 * and progress are computed, never stored, so these assert the two can never disagree. They act on
 * a plain task list, which is why they live here rather than on a container.
 */
describe('Task derived views', () => {
  test('roots and sub-tasks partition the flat array', ({ expect }) => {
    const parent = Task.make({ title: 'Parent' });
    const child = Task.make({ title: 'Child', parentTask: Ref.make(parent) });
    const grandchild = Task.make({ title: 'Grandchild', parentTask: Ref.make(child) });
    const tasks = [parent, child, grandchild];

    expect(Task.rootTasks(tasks).map((task) => task.title)).toEqual(['Parent']);
    expect(Task.subTasks(tasks, parent).map((task) => task.title)).toEqual(['Child']);
    expect(Task.subTasks(tasks, child).map((task) => task.title)).toEqual(['Grandchild']);
  });

  test('a task whose parent is absent reads as a root rather than vanishing', ({ expect }) => {
    const absent = Task.make({ title: 'Absent' });
    const orphan = Task.make({ title: 'Orphan', parentTask: Ref.make(absent) });

    expect(Task.rootTasks([orphan]).map((task) => task.title)).toEqual(['Orphan']);
  });

  test('sub-tasks inherit the nearest ancestor milestone, and an own milestone overrides', ({ expect }) => {
    const first = Milestone.make({ name: 'First' });
    const second = Milestone.make({ name: 'Second' });
    const parent = Task.make({ title: 'Parent', milestone: Ref.make(first) });
    const inherits = Task.make({ title: 'Inherits', parentTask: Ref.make(parent) });
    const overrides = Task.make({ title: 'Overrides', parentTask: Ref.make(parent), milestone: Ref.make(second) });
    const deep = Task.make({ title: 'Deep', parentTask: Ref.make(inherits) });
    const backlog = Task.make({ title: 'Backlog' });
    const tasks = [parent, inherits, overrides, deep, backlog];

    expect(Task.tasksForMilestone(tasks, first).map((task) => task.title)).toEqual(['Parent', 'Inherits', 'Deep']);
    expect(Task.tasksForMilestone(tasks, second).map((task) => task.title)).toEqual(['Overrides']);
    expect(Task.backlogTasks(tasks).map((task) => task.title)).toEqual(['Backlog']);
  });

  test('a parentTask cycle terminates instead of hanging', ({ expect }) => {
    const first = Task.make({ title: 'First' });
    const second = Task.make({ title: 'Second', parentTask: Ref.make(first) });
    Obj.update(first, (first) => {
      first.parentTask = Ref.make(second);
    });

    expect(Task.backlogTasks([first, second]).map((task) => task.title)).toEqual(['First', 'Second']);
  });

  test('progress counts done over non-cancelled, so a milestone cannot disagree with its tasks', ({ expect }) => {
    const milestone = Milestone.make({ name: 'Ship' });
    const tasks = [
      Task.make({ title: 'a', status: 'done', milestone: Ref.make(milestone) }),
      Task.make({ title: 'b', status: 'todo', milestone: Ref.make(milestone) }),
      Task.make({ title: 'c', status: 'cancelled', milestone: Ref.make(milestone) }),
    ];

    expect(Task.milestoneProgress(tasks, milestone)).toEqual({ total: 2, done: 1, ratio: 0.5 });
  });

  test('an empty milestone reports zero rather than complete', ({ expect }) => {
    const milestone = Milestone.make({ name: 'Empty' });

    expect(Task.milestoneProgress([], milestone)).toEqual({ total: 0, done: 0, ratio: 0 });
  });

  test('orderTasks follows the array, appending tasks the array does not list', ({ expect }) => {
    const first = Task.make({ title: 'First' });
    const second = Task.make({ title: 'Second' });
    const unlisted = Task.make({ title: 'Unlisted' });
    const refs = [Ref.make(second), Ref.make(first)];

    const ordered = Task.orderTasks([first, unlisted, second], refs);
    expect(ordered.map((task) => task.title)).toEqual(['Second', 'First', 'Unlisted']);
  });

  test('orderTasks keeps the first array position for a duplicated ref', ({ expect }) => {
    const task = Task.make({ title: 'Task' });
    const other = Task.make({ title: 'Other' });
    const refs = [Ref.make(task), Ref.make(other), Ref.make(task)];

    const ordered = Task.orderTasks([other, task], refs);
    expect(ordered.map((entry) => entry.title)).toEqual(['Task', 'Other']);
  });

  test('subtree walks descendants within the list, and stops at what the list holds', ({ expect }) => {
    const root = Task.make({ title: 'Root' });
    const child = Task.make({ title: 'Child', parentTask: Ref.make(root) });
    const grandchild = Task.make({ title: 'Grandchild', parentTask: Ref.make(child) });
    const sibling = Task.make({ title: 'Sibling' });

    expect(Task.subtree([root, child, grandchild, sibling], root).map((task) => task.title)).toEqual([
      'Root',
      'Child',
      'Grandchild',
    ]);
    expect(Task.subtree([root, grandchild], root).map((task) => task.title)).toEqual(['Root']);
  });
});

describe('refEntityId', () => {
  it.effect('reads the id off the URI, so an unloaded ref still compares', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(Task.make({ title: 'a', status: 'todo' }));
      yield* Database.flush();

      expect(Task.refEntityId(Ref.make(task).noInline())).toBe(task.id);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('collectSubtree', () => {
  it.effect('walks descendants and includes the root', () =>
    Effect.gen(function* () {
      const { root, child, grandchild, sibling } = yield* seedTree();

      const subtree = yield* Task.collectSubtree(root);

      expect(subtree.map((task) => task.id)).toEqual([root.id, child.id, grandchild.id]);
      expect(subtree.map((task) => task.id)).not.toContain(sibling.id);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('reaches a sub-task no list holds, since the walk goes through the reverse-ref index', () =>
    Effect.gen(function* () {
      const { root } = yield* seedTree();
      const stray = yield* Database.add(Task.make({ title: 'stray', status: 'todo', parentTask: Ref.make(root) }));
      yield* Database.flush();

      const subtree = yield* Task.collectSubtree(root);

      expect(subtree.map((task) => task.id)).toContain(stray.id);
      expect(Task.subtree([root], root).map((task) => task.id)).toEqual([root.id]);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('review', () => {
  it.effect('carries reviewers and the artifacts a task produced', () =>
    Effect.gen(function* () {
      // Any object can be an artifact; a second task stands in so the test registers no extra type.
      const doc = yield* Database.add(Task.make({ title: 'The poem' }));
      const task = yield* Database.add(
        Task.make({
          title: 'Write a poem',
          status: 'review',
          reviewers: [{ name: 'Rich' }],
          artifacts: [Ref.make(doc)],
        }),
      );
      yield* Database.flush();

      // `review` is a status of its own: work is finished but not closed, because someone was named.
      expect(task.status).toEqual('review');
      expect(task.reviewers?.map((reviewer) => reviewer.name)).toEqual(['Rich']);
      // The artifact is a ref, not a child: completing the task must not cascade to what it made.
      expect(Task.refEntityId(task.artifacts?.[0])).toEqual(doc.id);
      expect(Obj.getParent(doc)?.id).not.toEqual(task.id);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('completion', () => {
  it.effect('goes to review when someone was named, and done when nobody was', () =>
    Effect.gen(function* () {
      const reviewed = yield* Database.add(
        Task.make({ title: 'Reviewed', status: 'started', reviewers: [{ name: 'Rich' }] }),
      );
      const unreviewed = yield* Database.add(Task.make({ title: 'Unreviewed', status: 'started' }));
      yield* Database.flush();

      // Every writer asks for `done` — the agent tools, the list's checkbox — and none of them know
      // about reviewers, so the rule is on the write itself.
      Task.setStatus(reviewed, 'done');
      Task.setStatus(unreviewed, 'done');
      yield* Database.flush();

      // Finished, not closed: someone was named to look at it.
      expect(reviewed.status).toEqual('review');
      expect(unreviewed.status).toEqual('done');

      // The log records the transition that happened, not the one that was asked for.
      expect(changes(reviewed).at(-1)?.description).toEqual('Status changed from started to review.');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('a task in review is not closed by asking again', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(
        Task.make({ title: 'Reviewed', status: 'review', reviewers: [{ name: 'Rich' }] }),
      );
      yield* Database.flush();

      // What a session does: it asks for `done`, sees the task is not done, and asks again. Exempting
      // `review → done` let the second call close it, which is the reviewer's move, not the worker's.
      Task.setStatus(task, 'done');
      yield* Database.flush();
      expect(task.status).toEqual('review');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('approve is the one write that closes a reviewed task', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(
        Task.make({ title: 'Reviewed', status: 'review', reviewers: [{ name: 'Rich' }] }),
      );
      yield* Database.flush();

      Task.approve(task);
      yield* Database.flush();
      expect(task.status).toEqual('done');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('an update naming a reviewed task done still records its other fields', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(
        Task.make({ title: 'Reviewed', status: 'started', reviewers: [{ name: 'Rich' }] }),
      );
      yield* Database.flush();

      Task.update(task, { status: 'done', priority: 'high' });
      yield* Database.flush();
      expect(task.status).toEqual('review');
      expect(task.priority).toEqual('high');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('records what a task produced, once per object', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(Task.make({ title: 'Write a poem' }));
      const doc = yield* Database.add(Task.make({ title: 'The poem' }));
      yield* Database.flush();

      Task.addArtifact(task, doc);
      Task.addArtifact(task, doc);
      yield* Database.flush();

      // Idempotent: a session that files the same object twice must not double it.
      expect(task.artifacts).toHaveLength(1);
      expect(Task.refEntityId(task.artifacts?.[0])).toEqual(doc.id);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('owns its attachments, once per file, until detached', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(Task.make({ title: 'Fix the layout' }));
      const file = yield* File.fromBytes(new Uint8Array([1, 2, 3]), { name: 'screenshot.png', type: 'image/png' });
      yield* Database.add(file);
      yield* Database.flush();

      const entry = Task.addAttachment(task, file, { actor: { name: 'Rich', role: 'user' } });
      expect(Task.addAttachment(task, file)).toBeUndefined();
      yield* Database.flush();

      expect(task.attachments).toHaveLength(1);
      expect(entry?.description).toEqual('Attached "screenshot.png".');
      expect(changes(task).map(({ description }) => description)).toEqual(['Attached "screenshot.png".']);
      expect(changes(task)[0].actor?.name).toEqual('Rich');
      expect(Task.refEntityId(task.attachments?.[0])).toEqual(file.id);
      // Owned, so deleting the task deletes what was attached to it.
      expect(Obj.getParent(file)).toBe(task);

      const [ref] = task.attachments ?? [];
      Task.removeAttachment(task, ref);
      expect(Task.removeAttachment(task, ref)).toBeUndefined();
      yield* Database.flush();
      expect(task.attachments).toHaveLength(0);
      expect(changes(task).map(({ description }) => description)).toEqual([
        'Attached "screenshot.png".',
        'Removed attachment "screenshot.png".',
      ]);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('mutations', () => {
  it.effect('records one entry per edit, naming what changed', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(Task.make({ title: 'Draft launch email', status: 'todo' }));
      yield* Database.flush();

      const entry = Task.update(
        task,
        { status: 'done', assignee: { name: 'Scout', role: 'assistant' } },
        { actor: { name: 'Rich' } },
      );
      yield* Database.flush();

      // An edit is what the person did, so both fields share one note rather than one note each.
      expect(task.history).toHaveLength(1);
      expect(entry?.description).toEqual('Status changed from todo to done. Assigned to Scout.');
      expect(task.history?.[0].event).toEqual('updated');
      expect(task.history?.[0].actor?.name).toEqual('Rich');
      expect(task.status).toEqual('done');
      expect(task.assignee?.name).toEqual('Scout');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('writes nothing when an edit changes nothing', () =>
    Effect.gen(function* () {
      const assignee = { name: 'Scout', role: 'assistant' as const };
      const task = yield* Database.add(Task.make({ title: 'Draft launch email', status: 'todo', assignee }));
      yield* Database.flush();

      // Same values, and an equal-but-not-identical actor: a log of "done to done" is unreadable.
      const entry = Task.update(task, { status: 'todo', assignee: { name: 'Scout', role: 'assistant' } });
      yield* Database.flush();

      expect(entry).toBeUndefined();
      expect(task.history).toBeUndefined();
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('tells assistant actors apart by subject', () =>
    Effect.gen(function* () {
      const session = yield* Database.add(Task.make({ title: 'stands in for a session object' }));
      const task = yield* Database.add(
        Task.make({ title: 'Draft launch email', status: 'todo', assignee: { role: 'assistant' } }),
      );
      yield* Database.flush();

      // A bare assistant and one naming its session are different owners, so the edit is recorded.
      const entry = Task.update(task, { assignee: { role: 'assistant', subject: Ref.make(session) } });
      yield* Database.flush();

      expect(entry?.description).toEqual('Assigned to an agent.');
      expect(task.assignee?.subject?.target?.id).toEqual(session.id);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('clears an optional field with null and says so', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(
        Task.make({ title: 'Draft launch email', status: 'todo', assignee: { name: 'Scout' }, estimate: 'm' }),
      );
      yield* Database.flush();

      Task.setAssignee(task, null);
      Task.update(task, { estimate: null });
      yield* Database.flush();

      expect(task.assignee).toBeUndefined();
      expect(task.estimate).toBeUndefined();
      expect(changes(task).map((entry) => entry.description)).toEqual(['Unassigned.', 'Estimate cleared.']);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('edits the text without narrating it', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(Task.make({ title: 'Draft launch email', status: 'todo' }));
      yield* Database.flush();

      // The text is edited by typing, and every blur commits: a log of "Description updated." buries
      // the entries a reader opens the history for.
      const entry = Task.update(task, { title: 'Draft the launch email', description: 'Send it Friday.' });
      yield* Database.flush();

      expect(entry).toBeUndefined();
      expect(task.history).toBeUndefined();
      expect(task.title).toEqual('Draft the launch email');
      expect(task.description).toEqual('Send it Friday.');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('narrates the work an edit changed, not the text beside it', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(Task.make({ title: 'Draft launch email', status: 'todo' }));
      yield* Database.flush();

      const entry = Task.update(task, { title: 'Draft the launch email', status: 'started' });
      yield* Database.flush();

      expect(entry?.description).toEqual('Status changed from todo to started.');
      expect(task.history).toHaveLength(1);
      expect(task.title).toEqual('Draft the launch email');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('records a caller that has something to say about a silent edit', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(Task.make({ title: 'Draft launch email', status: 'todo' }));
      yield* Database.flush();

      const entry = Task.update(task, { description: 'Send it Friday.' }, { description: 'Scope agreed in standup.' });
      yield* Database.flush();

      expect(entry?.description).toEqual('Scope agreed in standup.');
      expect(task.history).toHaveLength(1);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('setStatus records the transition, and the caller may date it', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(Task.make({ title: 'Draft launch email' }));
      yield* Database.flush();

      Task.setStatus(task, 'started', { date: '2026-08-01T10:00:00.000Z' });
      yield* Database.flush();

      // No prior status, so the note states the value rather than inventing a transition.
      expect(task.history?.[0].event).toEqual('updated');
      expect(changes(task)[0]?.description).toEqual('Status set to started.');
      expect(task.history?.[0].date).toEqual('2026-08-01T10:00:00.000Z');
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('history', () => {
  it.effect('records an activity log that round-trips through the database', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(
        Task.make({
          title: 'Draft launch email',
          status: 'todo',
          history: [
            {
              id: EntityId.random(),
              date: '2026-08-01T09:00:00.000Z',
              event: 'created',
              description: 'Task created.',
            },
          ],
        }),
      );
      yield* Database.flush();

      // Append-only by convention: an entry records something that happened, so the write adds
      // rather than rewrites.
      Obj.update(task, (task) => {
        task.history ??= [];
        task.history.push({
          id: EntityId.random(),
          date: '2026-08-02T10:30:00.000Z',
          actor: { name: 'Scout', role: 'assistant' },
          event: 'updated',
          description: 'Status changed from todo to done.',
        });
      });
      yield* Database.flush();

      expect(task.history?.map((entry) => entry.event)).toEqual(['created', 'updated']);
      expect(task.history?.[1].actor?.name).toEqual('Scout');
      expect(changes(task)[1]?.description).toEqual('Status changed from todo to done.');
      // The actor is optional: something the system did on its own has none.
      expect(task.history?.[0].actor).toBeUndefined();
    }).pipe(Effect.provide(testLayer())),
  );
});

const testLayer = () => TestDatabaseLayer({ types: [Blob.Blob, File.File, Milestone.Milestone, Task.Task] });

const seedTree = () =>
  Effect.gen(function* () {
    const root = yield* Database.add(Task.make({ title: 'root', status: 'todo' }));
    const child = yield* Database.add(Task.make({ title: 'child', status: 'todo', parentTask: Ref.make(root) }));
    const grandchild = yield* Database.add(
      Task.make({ title: 'grandchild', status: 'todo', parentTask: Ref.make(child) }),
    );
    const sibling = yield* Database.add(Task.make({ title: 'sibling', status: 'todo' }));
    yield* Database.flush();
    return { root, child, grandchild, sibling };
  });

describe('legacy history', () => {
  it.effect('loads change entries logged before entries carried ids', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(
        Task.make({
          title: 'Draft launch email',
          history: [{ date: '2026-08-01T09:00:00.000Z', event: 'created', description: 'Task created.' }],
        }),
      );
      yield* Database.flush();

      Task.setStatus(task, 'started');
      yield* Database.flush();

      expect(changes(task).map(({ event }) => event)).toEqual(['created', 'updated']);
      expect(changes(task)[0].id).toBeUndefined();
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('questions', () => {
  it.effect('pairs an answer with the question it names', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(Task.make({ title: 'Draft refund policy', status: 'started' }));
      yield* Database.flush();

      const question = Task.ask(task, {
        text: '  What is our refund window?  ',
        context: 'The policy needs a number.',
        options: [{ title: '30 days' }, { title: '60 days', description: 'Matches the competition.' }],
      });
      expect(Task.getPendingQuestions(task.history).map(({ id }) => id)).toEqual([question.id]);
      expect(question.text).toEqual('What is our refund window?');

      const answer = Task.answer(task, question.id, ' 60 days ', { actor: { name: 'Rich' } });
      yield* Database.flush();

      expect(answer?.questionId).toEqual(question.id);
      expect(answer?.answer).toEqual('60 days');
      expect(task.history?.map((entry) => entry.event)).toEqual(['question', 'answer']);
      expect(Task.getPendingQuestions(task.history)).toHaveLength(0);
      expect(Task.getQuestions(task.history)[0].answer?.id).toEqual(answer?.id);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('takes an actor the task already holds as its assignee', () =>
    Effect.gen(function* () {
      const agent = { role: 'assistant' as const, name: 'Scout' };
      const task = yield* Database.add(Task.make({ title: 'Draft refund policy', assignee: agent }));
      yield* Database.flush();

      // The same record as the assignee: ECHO refuses to own one record twice, so the log keeps a copy.
      Task.ask(task, { text: 'Which one?', actor: task.assignee });
      Task.setStatus(task, 'blocked', { actor: task.assignee });
      yield* Database.flush();

      expect(task.history?.map((entry) => entry.actor?.name)).toEqual(['Scout', 'Scout']);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('refuses a blank, unknown or second answer, writing nothing', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(Task.make({ title: 'Draft refund policy' }));
      yield* Database.flush();

      const question = Task.ask(task, { text: 'Which one?' });
      expect(Task.answer(task, question.id, '   ')).toBeUndefined();
      expect(Task.answer(task, EntityId.random(), 'Either')).toBeUndefined();
      expect(Task.answer(task, question.id, 'The first')).toBeDefined();
      expect(Task.answer(task, question.id, 'The second')).toBeUndefined();
      yield* Database.flush();

      expect(task.history?.map((entry) => entry.event)).toEqual(['question', 'answer']);
    }).pipe(Effect.provide(testLayer())),
  );
});
