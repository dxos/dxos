//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Organization, PullRequest, Task, TaskSet } from '@dxos/types';

import addArtifact from './add-artifact.ts';
import createTask from './create-task.ts';

describe('add-artifact', () => {
  it.effect('records the object on the task once', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      const artifact = yield* Database.add(Organization.make({ name: 'Acme' }));
      yield* Database.flush();
      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Research Acme' });

      yield* addArtifact.handler({ task: Ref.make(task), object: Ref.make(artifact) });
      yield* addArtifact.handler({ task: Ref.make(task), object: Ref.make(artifact) });

      expect(task.artifacts?.map((ref) => ref.target?.id)).toEqual([artifact.id]);
    }).pipe(
      Effect.provide(
        TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet, Organization.Organization] }),
      ),
    ),
  );

  const prLayer = TestDatabaseLayer({
    types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet, Organization.Organization, PullRequest.PullRequest],
  });

  const makePullRequest = (number: number, state: PullRequest.State = 'open') =>
    Database.add(
      PullRequest.make({
        owner: 'dxos',
        repo: 'dxos',
        number,
        title: `PR ${number}`,
        state,
        url: `https://github.com/dxos/dxos/pull/${number}`,
      }),
    );

  const makeTree = Effect.fnUntraced(function* () {
    const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
    yield* Database.flush();
    const { task: root } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Root' });
    const { task: child } = yield* createTask.handler({
      taskSet: Ref.make(taskSet),
      title: 'Child',
      parentTask: Ref.make(root),
    });
    return { root, child };
  });

  it.effect('records a pull request made for a sub-task on the root of its tree', () =>
    Effect.gen(function* () {
      const { root, child } = yield* makeTree();
      const pullRequest = yield* makePullRequest(1);
      yield* Database.flush();

      const result = yield* addArtifact.handler({ task: Ref.make(child), object: Ref.make(pullRequest) });

      expect(result.task.id).toBe(root.id);
      expect(root.artifacts?.map((ref) => Task.refEntityId(ref))).toEqual([pullRequest.id]);
      expect(child.artifacts ?? []).toHaveLength(0);
    }).pipe(Effect.provide(prLayer)),
  );

  it.effect('refuses a second open pull request for the same tree', () =>
    Effect.gen(function* () {
      const { root, child } = yield* makeTree();
      const first = yield* makePullRequest(1);
      const second = yield* makePullRequest(2);
      yield* Database.flush();
      yield* addArtifact.handler({ task: Ref.make(root), object: Ref.make(first) });

      const error = yield* addArtifact.handler({ task: Ref.make(child), object: Ref.make(second) }).pipe(Effect.flip);

      expect(error).toBeInstanceOf(Task.PullRequestConflictError);
      expect(error.message).toContain('https://github.com/dxos/dxos/pull/1');
      expect(root.artifacts?.map((ref) => Task.refEntityId(ref))).toEqual([first.id]);

      // Re-adding the tree's own PR stays the usual no-op, not a conflict.
      yield* addArtifact.handler({ task: Ref.make(child), object: Ref.make(first) });
    }).pipe(Effect.provide(prLayer)),
  );

  it.effect('refuses a pull request when a sub-task already holds a different open one', () =>
    Effect.gen(function* () {
      const { root, child } = yield* makeTree();
      const legacy = yield* makePullRequest(1);
      const second = yield* makePullRequest(2);
      yield* Database.flush();
      // Recorded on the sub-task itself, as PRs were before they were routed to the root.
      Task.addArtifact(child, legacy);

      const error = yield* addArtifact.handler({ task: Ref.make(root), object: Ref.make(second) }).pipe(Effect.flip);

      expect(error).toBeInstanceOf(Task.PullRequestConflictError);
      expect(error.message).toContain('"Root"');
      expect(error.message).toContain('https://github.com/dxos/dxos/pull/1');
      expect(root.artifacts ?? []).toHaveLength(0);

      // The sub-task's own PR is not a conflict with itself.
      yield* addArtifact.handler({ task: Ref.make(child), object: Ref.make(legacy) });
      expect(root.artifacts?.map((ref) => Task.refEntityId(ref))).toEqual([legacy.id]);
    }).pipe(Effect.provide(prLayer)),
  );

  it.effect('accepts a new pull request once the earlier one is closed', () =>
    Effect.gen(function* () {
      const { root, child } = yield* makeTree();
      const closed = yield* makePullRequest(1, 'closed');
      const replacement = yield* makePullRequest(2);
      yield* Database.flush();
      yield* addArtifact.handler({ task: Ref.make(root), object: Ref.make(closed) });

      yield* addArtifact.handler({ task: Ref.make(child), object: Ref.make(replacement) });

      expect(root.artifacts?.map((ref) => Task.refEntityId(ref))).toEqual([closed.id, replacement.id]);
    }).pipe(Effect.provide(prLayer)),
  );

  it.effect('keeps a non-PR artifact on the sub-task it was made for', () =>
    Effect.gen(function* () {
      const { root, child } = yield* makeTree();
      const artifact = yield* Database.add(Organization.make({ name: 'Acme' }));
      yield* Database.flush();

      const result = yield* addArtifact.handler({ task: Ref.make(child), object: Ref.make(artifact) });

      expect(result.task.id).toBe(child.id);
      expect(child.artifacts?.map((ref) => Task.refEntityId(ref))).toEqual([artifact.id]);
      expect(root.artifacts ?? []).toHaveLength(0);
    }).pipe(Effect.provide(prLayer)),
  );
});
