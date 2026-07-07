//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Obj, Ref, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Connection, SyncBinding } from '@dxos/plugin-connector';
import { AccessToken, Cursor, Organization, Person, Project, Task } from '@dxos/types';

import { GITHUB_SOURCE } from '../constants';
import { GitHubApi } from '../services';
import { pushRepoUpdates } from './sync';

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

describe('plugin-github sync — push (snapshot diff → PATCH)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /**
   * Builds a `SyncBinding` relation (source = Connection, target = a Project
   * standing in for the repo's local root) plus seeds the binding's snapshots
   * as if a previous pull had run.
   */
  const setup = async (snapshots: Record<string, unknown>) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([
      AccessToken.AccessToken,
      Connection.Connection,
      Cursor.Cursor,
      SyncBinding.SyncBinding,
      Organization.Organization,
      Person.Person,
      Project.Project,
      Task.Task,
    ]);
    const token = db.add(Obj.make(AccessToken.AccessToken, { source: GITHUB_SOURCE, token: 'tok' }));
    const connection = db.add(Obj.make(Connection.Connection, { connectorId: 'github', accessToken: Ref.make(token) }));
    const project = db.add(
      Obj.make(Project.Project, {
        [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: String(repo().id) }] },
        name: repo().full_name,
        // Seed description to match a prior pull so tests that only diverge `name`
        // don't trip the description-push path.
        description: repo().description ?? undefined,
      }),
    );
    const binding = db.add(
      SyncBinding.make({
        [Relation.Source]: connection,
        [Relation.Target]: project,
        remoteId: String(repo().id),
        snapshots,
      }),
    );
    return { db, binding, project };
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
      return yield* pushRepoUpdates(binding, repo(), new Map([['5678', issue()]]), {
        updateIssue: (_owner, _repo, num, input) => {
          updateIssueInput = input;
          updateIssueNumber = num;
          return Effect.succeed(undefined);
        },
        updateRepo: () => Effect.succeed(undefined),
      });
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    expect(result.tasks).toBe(1);
    expect(updateIssueNumber).toBe(42);
    expect(updateIssueInput).toEqual({ title: 'Edited locally' });
    // Snapshot refreshed on the binding.
    const snapshots = (binding.snapshots ?? {}) as Record<string, any>;
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
      return yield* pushRepoUpdates(binding, repo(), new Map([['5678', issue()]]), {
        updateIssue: () => {
          calls++;
          return Effect.succeed(undefined);
        },
        updateRepo: () => Effect.succeed(undefined),
      });
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    expect(result.tasks).toBe(0);
    expect(calls).toBe(0);
  });

  test('local status flip → PATCH state', async ({ expect }) => {
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
      yield* pushRepoUpdates(binding, repo(), new Map([['5678', issue()]]), {
        updateIssue: (_owner, _repo, _num, input) => {
          updateIssueInput = input;
          return Effect.succeed(undefined);
        },
        updateRepo: () => Effect.succeed(undefined),
      });
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    expect(updateIssueInput?.state).toBe('closed');
  });

  test('locally-edited repo description → PATCH /repos', async ({ expect }) => {
    const { db, binding, project } = await setup({
      '1234': { name: 'dxos/composer', description: 'composer monorepo' },
    });
    Obj.update(project, (project) => {
      project.description = 'rewritten';
    });

    let updateRepoInput: GitHubApi.RepoUpdateInput | undefined;
    const result = await Effect.gen(function* () {
      return yield* pushRepoUpdates(binding, repo(), new Map(), {
        updateIssue: () => Effect.succeed(undefined),
        updateRepo: (_owner, _repo, input) => {
          updateRepoInput = input;
          return Effect.succeed(undefined);
        },
      });
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    expect(result.projects).toBe(1);
    expect(updateRepoInput).toEqual({ description: 'rewritten' });
  });

  test('repo rename diverges locally → logged but NOT pushed', async ({ expect }) => {
    const { db, binding, project } = await setup({
      '1234': { name: 'dxos/composer', description: 'composer monorepo' },
    });
    Obj.update(project, (project) => {
      project.name = 'dxos/composer-renamed';
    });

    let calls = 0;
    const result = await Effect.gen(function* () {
      return yield* pushRepoUpdates(binding, repo(), new Map(), {
        updateIssue: () => Effect.succeed(undefined),
        updateRepo: () => {
          calls++;
          return Effect.succeed(undefined);
        },
      });
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    expect(result.projects).toBe(0);
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
      return yield* pushRepoUpdates(binding, repo(), new Map([['5678', pullRequestIssue]]), {
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
    expect(result.tasks).toBe(0);
    expect(calls).toBe(0);
    expect(updateIssueInput).toBeUndefined();
    // Snapshot status stays at the previous remote-pulled value so the
    // divergence warning keeps firing each sync until either the user
    // reverts locally or GitHub catches up.
    const snapshots = (binding.snapshots ?? {}) as Record<string, any>;
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
      yield* pushRepoUpdates(binding, repo(), new Map([['5678', pullRequestIssue]]), {
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
      return yield* pushRepoUpdates(binding, repo(), new Map([['5678', issue()]]), {
        updateIssue: () => {
          calls++;
          return Effect.succeed(undefined);
        },
        updateRepo: () => Effect.succeed(undefined),
      });
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    expect(result.tasks).toBe(0);
    expect(calls).toBe(0);
  });
});
