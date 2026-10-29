//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Progress from '@dxos/app-toolkit/Progress';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { Milestone, Organization, Person, PullRequest, Repo, Task, TaskSet } from '@dxos/types';

import { GITHUB_SOURCE } from '../constants.ts';
import { GitHubApi } from '../services/index.ts';
import { pushRepoUpdates, setTaskContainer, syncRepoBinding, upsertMilestone, upsertTask } from './sync.ts';

const repo = (overrides: Partial<GitHubApi.GitHubRepo> = {}): GitHubApi.GitHubRepo => ({
  id: 1234,
  name: 'composer',
  full_name: 'dxos/composer',
  description: 'composer monorepo',
  owner: { id: 1, login: 'dxos' },
  ...overrides,
});

const issue = (overrides: Partial<GitHubApi.GitHubIssue> = {}): GitHubApi.GitHubIssue => ({
  id: 5678,
  number: 42,
  title: 'Investigate flake',
  body: 'desc',
  state: 'open',
  ...overrides,
});

const milestone = (overrides: Partial<GitHubApi.GitHubMilestone> = {}): GitHubApi.GitHubMilestone => ({
  id: 91011,
  number: 3,
  title: 'v1.0',
  description: 'first stable release',
  state: 'open',
  due_on: '2026-06-01T07:00:00Z',
  ...overrides,
});

/** What a push addresses the bound repository by. */
const coordinates = { id: '1234', owner: 'dxos', name: 'composer' };

/** Answers the endpoints a repo sync calls; the repo's owner is a user, so the org lookup is a 404. */
const githubFetch =
  (issues: GitHubApi.GitHubIssue[]): typeof globalThis.fetch =>
  async (input) => {
    const { pathname } = new URL(input instanceof Request ? input.url : input);
    const body =
      pathname === '/repos/dxos/composer'
        ? repo()
        : pathname === '/repos/dxos/composer/milestones'
          ? []
          : pathname === '/repos/dxos/composer/issues'
            ? issues
            : undefined;
    return body === undefined ? new Response('Not Found', { status: 404 }) : Response.json(body);
  };

describe('plugin-github sync - push (snapshot diff -> PATCH)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /**
   * Builds an external-sync `Cursor` (spec.source = Connection's access token, spec.target = the
   * repo's `Repo`), the issue `TaskSet` keyed like the repo, and seeds the binding's snapshots as if
   * a previous pull had run.
   */
  const setup = async (snapshots: Record<string, unknown>) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([
      AccessToken.AccessToken,
      Connection.Connection,
      Cursor.Cursor,
      Organization.Organization,
      Person.Person,
      TaskSet.TaskSet,
      Task.Task,
      Milestone.Milestone,
      Repo.Repo,
      PullRequest.PullRequest,
    ]);
    const token = db.add(Obj.make(AccessToken.AccessToken, { source: GITHUB_SOURCE, token: 'tok' }));
    const connection = db.add(Obj.make(Connection.Connection, { connectorId: 'github', accessToken: Ref.make(token) }));
    const project = db.add(
      TaskSet.make({
        [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: String(repo().id) }] },
        name: repo().full_name,
      }),
    );
    const local = db.add(
      Repo.make({
        [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: String(repo().id) }] },
        owner: 'dxos',
        name: 'composer',
        // Seed description to match a prior pull so tests that only diverge `name`
        // don't trip the description-push path.
        description: repo().description ?? undefined,
      }),
    );
    const created = db.add(
      Cursor.makeExternal({
        source: Connection.getAccessToken(connection),
        target: Ref.make(local),
        externalId: String(repo().id),
        snapshots,
      }),
    );
    if (!Cursor.isExternal(created)) {
      throw new Error('expected external-sync cursor');
    }
    return { db, binding: created, project, local };
  };

  test('locally-edited issue title PATCHes only diverged fields', async ({ expect }) => {
    const { db, binding } = await setup({
      '5678': { title: 'Investigate flake', description: 'desc', status: 'todo' },
    });

    // Seed local task as if a previous pull had run.
    const localTask = db.add(
      Task.make({
        [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: '5678' }] },
        title: 'Edited locally',
        description: 'desc',
        status: 'todo',
      }),
    );

    let updateIssueInput: GitHubApi.IssueUpdateInput | undefined;
    let updateIssueNumber: number | undefined;
    const result = await Effect.gen(function* () {
      return yield* pushRepoUpdates(binding, coordinates, new Map([['5678', issue()]]), {
        updateIssue: (_owner, _repo, num, input) => {
          updateIssueInput = input;
          updateIssueNumber = num;
          return Effect.succeed(undefined);
        },
        updateRepo: () => Effect.succeed(undefined),
      });
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    expect(result.issues).toBe(1);
    expect(updateIssueNumber).toBe(42);
    expect(updateIssueInput).toEqual({ title: 'Edited locally' });
    // Snapshot refreshed on the binding.
    const snapshots = (binding.spec.snapshots ?? {}) as Record<string, any>;
    expect(snapshots['5678']?.title).toBe('Edited locally');
    void localTask;
  });

  test('snapshot-equal task is not pushed', async ({ expect }) => {
    const { db, binding } = await setup({
      '5678': { title: 'Investigate flake', description: 'desc', status: 'todo' },
    });

    db.add(
      Task.make({
        [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: '5678' }] },
        title: 'Investigate flake',
        description: 'desc',
        status: 'todo',
      }),
    );

    let calls = 0;
    const result = await Effect.gen(function* () {
      return yield* pushRepoUpdates(binding, coordinates, new Map([['5678', issue()]]), {
        updateIssue: () => {
          calls++;
          return Effect.succeed(undefined);
        },
        updateRepo: () => Effect.succeed(undefined),
      });
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    expect(result.issues).toBe(0);
    expect(calls).toBe(0);
  });

  test('local status flip -> PATCH state', async ({ expect }) => {
    const { db, binding } = await setup({
      '5678': { title: 'Investigate flake', description: 'desc', status: 'todo' },
    });

    db.add(
      Task.make({
        [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: '5678' }] },
        title: 'Investigate flake',
        description: 'desc',
        status: 'done',
      }),
    );

    let updateIssueInput: GitHubApi.IssueUpdateInput | undefined;
    await Effect.gen(function* () {
      yield* pushRepoUpdates(binding, coordinates, new Map([['5678', issue()]]), {
        updateIssue: (_owner, _repo, _num, input) => {
          updateIssueInput = input;
          return Effect.succeed(undefined);
        },
        updateRepo: () => Effect.succeed(undefined),
      });
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    expect(updateIssueInput?.state).toBe('closed');
  });

  test('locally-edited repo description -> PATCH /repos', async ({ expect }) => {
    const { db, binding, local } = await setup({
      '1234': { name: 'composer', description: 'composer monorepo' },
    });
    Obj.update(local, (local) => {
      local.description = 'rewritten';
    });

    let updateRepoInput: GitHubApi.RepoUpdateInput | undefined;
    const result = await Effect.gen(function* () {
      return yield* pushRepoUpdates(binding, coordinates, new Map(), {
        updateIssue: () => Effect.succeed(undefined),
        updateRepo: (_owner, _repo, input) => {
          updateRepoInput = input;
          return Effect.succeed(undefined);
        },
      });
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    expect(result.repos).toBe(1);
    expect(updateRepoInput).toEqual({ description: 'rewritten' });
  });

  test('repo rename diverges locally -> logged but NOT pushed', async ({ expect }) => {
    const { db, binding, local } = await setup({
      '1234': { name: 'composer', description: 'composer monorepo' },
    });
    Obj.update(local, (local) => {
      local.name = 'composer-renamed';
    });

    let calls = 0;
    const result = await Effect.gen(function* () {
      return yield* pushRepoUpdates(binding, coordinates, new Map(), {
        updateIssue: () => Effect.succeed(undefined),
        updateRepo: () => {
          calls++;
          return Effect.succeed(undefined);
        },
      });
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    expect(result.repos).toBe(0);
    expect(calls).toBe(0);
  });

  test('PR status divergence is NOT pushed (status is pull-only for PRs)', async ({ expect }) => {
    // GitHub's /issues/{n} endpoint accepts state changes for both issues and
    // PRs, but `closed` on a PR rejects it (closed-without-merge). The push
    // path skips status changes for PRs and logs instead.
    const { db, binding } = await setup({
      '5678': { title: 'fix flake', description: 'desc', status: 'todo' },
    });

    db.add(
      Task.make({
        [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: '5678' }] },
        title: 'fix flake',
        description: 'desc',
        status: 'done',
      }),
    );

    const pullRequestIssue = issue({
      pull_request: { url: 'https://api.github.com/repos/dxos/dxos/pulls/42', merged_at: null },
    });

    let updateIssueInput: GitHubApi.IssueUpdateInput | undefined;
    let calls = 0;
    const result = await Effect.gen(function* () {
      return yield* pushRepoUpdates(binding, coordinates, new Map([['5678', pullRequestIssue]]), {
        updateIssue: (_owner, _repo, _num, input) => {
          calls++;
          updateIssueInput = input;
          return Effect.succeed(undefined);
        },
        updateRepo: () => Effect.succeed(undefined),
      });
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    // No task push (status was the only diverging field, and PR status is
    // pull-only).
    expect(result.issues).toBe(0);
    expect(calls).toBe(0);
    expect(updateIssueInput).toBeUndefined();
    // Snapshot status stays at the previous remote-pulled value so the
    // divergence warning keeps firing each sync until either the user
    // reverts locally or GitHub catches up.
    const snapshots = (binding.spec.snapshots ?? {}) as Record<string, any>;
    expect(snapshots['5678']?.status).toBe('todo');
  });

  test('PR title divergence still pushes (only status is pull-only)', async ({ expect }) => {
    const { db, binding } = await setup({
      '5678': { title: 'fix flake', description: 'desc', status: 'todo' },
    });

    db.add(
      Task.make({
        [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: '5678' }] },
        title: 'fix flake (renamed)',
        description: 'desc',
        status: 'todo',
      }),
    );

    const pullRequestIssue = issue({
      pull_request: { url: 'https://api.github.com/repos/dxos/dxos/pulls/42', merged_at: null },
    });

    let updateIssueInput: GitHubApi.IssueUpdateInput | undefined;
    await Effect.gen(function* () {
      yield* pushRepoUpdates(binding, coordinates, new Map([['5678', pullRequestIssue]]), {
        updateIssue: (_owner, _repo, _num, input) => {
          updateIssueInput = input;
          return Effect.succeed(undefined);
        },
        updateRepo: () => Effect.succeed(undefined),
      });
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    expect(updateIssueInput).toEqual({ title: 'fix flake (renamed)' });
    expect(updateIssueInput?.state).toBeUndefined();
  });

  test('soft-deleted local task is not pushed', async ({ expect }) => {
    const { db, binding } = await setup({
      '5678': { title: 'orig', description: '', status: 'todo' },
    });

    const task = db.add(
      Task.make({
        [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: '5678' }] },
        title: 'edited locally',
        description: '',
        status: 'todo',
      }),
    );
    await db.remove(task);

    let calls = 0;
    const result = await Effect.gen(function* () {
      return yield* pushRepoUpdates(binding, coordinates, new Map([['5678', issue()]]), {
        updateIssue: () => {
          calls++;
          return Effect.succeed(undefined);
        },
        updateRepo: () => Effect.succeed(undefined),
      });
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    expect(result.issues).toBe(0);
    expect(calls).toBe(0);
  });

  test('pull adds the task to the set once, however many passes run', async ({ expect }) => {
    const { db, binding, project } = await setup({});
    const layer = Database.layer(db);

    const task = await Effect.gen(function* () {
      const { task } = yield* upsertTask(binding, issue(), undefined, undefined);
      yield* setTaskContainer(task, project);
      yield* setTaskContainer(task, project);
      return task;
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    expect(project.tasks.map((ref) => ref.target?.id)).toEqual([task.id]);
    // The parent edge rides along so the task cascades with the set.
    expect(Obj.getParent(task)?.id).toBe(project.id);
  });

  test('an issue moved between repos moves its ref', async ({ expect }) => {
    const { db, binding, project } = await setup({});
    const layer = Database.layer(db);
    const other = db.add(TaskSet.make({ name: 'dxos/other' }));

    const task = await Effect.gen(function* () {
      const { task } = yield* upsertTask(binding, issue(), undefined, undefined);
      yield* setTaskContainer(task, project);
      yield* Database.flush();
      yield* setTaskContainer(task, other);
      return task;
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    expect(project.tasks).toEqual([]);
    expect(other.tasks.map((ref) => ref.target?.id)).toEqual([task.id]);
    expect(Obj.getParent(task)?.id).toBe(other.id);
  });

  test('a mirrored task filed as a sub-task leaves its parent when re-rooted', async ({ expect }) => {
    const { db, binding, project } = await setup({});
    const layer = Database.layer(db);
    const parent = TaskSet.addTask(db, project, 'Local parent');

    const task = await Effect.gen(function* () {
      const { task } = yield* upsertTask(binding, issue(), undefined, undefined);
      TaskSet.moveTask(project, task, { parentTask: parent });
      yield* Database.flush();
      yield* setTaskContainer(task, project);
      return task;
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    expect(parent.subtasks ?? []).toEqual([]);
    expect(project.tasks.map((ref) => ref.target?.id)).toEqual([parent.id, task.id]);
    expect(Obj.getParent(task)?.id).toBe(project.id);
  });

  test('a stale set entry for a task parented elsewhere does not stop it being re-rooted', async ({ expect }) => {
    const { db, binding, project } = await setup({});
    const layer = Database.layer(db);
    const parent = TaskSet.addTask(db, project, 'Local parent');

    const task = await Effect.gen(function* () {
      const { task } = yield* upsertTask(binding, issue(), undefined, undefined);
      TaskSet.moveTask(project, task, { parentTask: parent });
      // The entry a concurrent peer's list write can leave behind.
      Obj.update(project, (project) => {
        project.tasks.push(Ref.make(task));
      });
      yield* Database.flush();
      yield* setTaskContainer(task, project);
      return task;
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    expect(parent.subtasks ?? []).toEqual([]);
    expect(project.tasks.map((ref) => ref.target?.id)).toEqual([parent.id, task.id]);
    expect(Obj.getParent(task)?.id).toBe(project.id);
  });

  test('milestones are mirrored onto the set with a date-only target', async ({ expect }) => {
    const { db, binding, project } = await setup({});
    const layer = Database.layer(db);

    const { task, local } = await Effect.gen(function* () {
      const local = yield* upsertMilestone(project, milestone());
      // Re-pull to prove the ref is not appended twice.
      yield* upsertMilestone(project, milestone({ title: 'v1.0.1' }));
      const { task } = yield* upsertTask(binding, issue({ milestone: milestone() }), undefined, local);
      return { task, local };
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    expect(project.milestones.map((ref) => ref.target?.id)).toEqual([local.id]);
    expect(local.name).toBe('v1.0.1');
    expect(local.targetDate).toBe('2026-06-01');
    expect(task.milestone?.target?.id).toBe(local.id);
  });

  test('an issue unassigned from its milestone remotely is cleared locally', async ({ expect }) => {
    const { db, binding, project } = await setup({});
    const layer = Database.layer(db);

    const task = await Effect.gen(function* () {
      const local = yield* upsertMilestone(project, milestone());
      const { task } = yield* upsertTask(binding, issue({ milestone: milestone() }), undefined, local);
      yield* upsertTask(binding, issue(), undefined, undefined);
      return task;
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    expect(task.milestone).toBeUndefined();
  });

  test('reports one meter per repo, sized to its issues before any is counted', async ({ expect }) => {
    const { db, binding, local } = await setup({});
    const issues = [
      issue({ id: 1, number: 1 }),
      issue({ id: 2, number: 2, title: 'Second' }),
      issue({ id: 3, number: 3, title: 'Third' }),
    ];

    const statusUpdates: Trace.PayloadType<typeof Trace.StatusUpdate>[] = [];
    const traceLayer = Trace.testTraceService().pipe(
      Layer.provide(
        Layer.succeed(Trace.TraceSink, {
          write: (message) => {
            for (const event of Trace.flatten(message)) {
              if (Trace.isOfType(Trace.StatusUpdate, event)) {
                statusUpdates.push(event.data);
              }
            }
          },
        }),
      ),
    );
    const services = Layer.mergeAll(
      Database.layer(db),
      traceLayer,
      Layer.succeed(Operation.Service, {
        invoke: (operation, ..._args) => Effect.fail(new Operation.NoHandlerError(operation.meta.key)),
        schedule: () => Effect.void,
        invokePromise: async () => ({ error: new Error('Operation.Service unused') }),
      }),
      Layer.succeed(Credential.CredentialsService, {
        queryCredentials: async () => [],
        getCredential: async () => {
          throw new Error('the token is stored on the object');
        },
      }),
    );

    await syncRepoBinding(binding).pipe(
      Effect.provideService(FetchHttpClient.Fetch, githubFetch(issues)),
      Effect.provide(services),
      EffectEx.runAndForwardErrors,
    );

    const syncKey = Progress.createSyncKey(local);
    expect(statusUpdates.every((update) => update.progress?.key === syncKey)).toBe(true);
    const totalIndex = statusUpdates.findIndex((update) => update.progress?.total !== undefined);
    const firstCountIndex = statusUpdates.findIndex((update) => (update.progress?.current ?? 0) > 0);
    expect(statusUpdates[totalIndex]?.progress?.total).toBe(issues.length);
    expect(totalIndex).toBeLessThan(firstCountIndex);
    const counts = statusUpdates.flatMap((update) =>
      update.progress?.current === undefined ? [] : [update.progress.current],
    );
    expect(counts.at(-1)).toBe(issues.length);
    expect(statusUpdates.at(-1)?.message).toBe(Progress.STATUS_COMPLETE);
  });
});
