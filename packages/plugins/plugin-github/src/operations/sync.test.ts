//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';
import { Integration } from '@dxos/plugin-integration/types';
import { AccessToken, Organization, Person, Project, Task } from '@dxos/types';

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

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    await graph.schemaRegistry.register([
      AccessToken.AccessToken,
      Integration.Integration,
      Organization.Organization,
      Person.Person,
      Project.Project,
      Task.Task,
    ]);
    const token = db.add(Obj.make(AccessToken.AccessToken, { source: GITHUB_SOURCE, token: 'tok' }));
    const integration = db.add(Obj.make(Integration.Integration, { accessToken: Ref.make(token), targets: [] }));
    return { db, integration };
  };

  test('locally-edited issue title PATCHes only diverged fields', async ({ expect }) => {
    const { db, integration } = await setup();

    // Seed snapshot + local task as if a previous pull had run.
    Obj.update(integration, (integration) => {
      const m = integration as Obj.Mutable<typeof integration>;
      m.snapshots = {
        '5678': { title: 'Investigate flake', description: 'desc', status: 'todo' },
      };
    });
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
      return yield* pushRepoUpdates(integration, repo(), new Map([['5678', issue()]]), {
        updateIssue: (_owner, _repo, num, input) => {
          updateIssueInput = input;
          updateIssueNumber = num;
          return Effect.succeed(undefined);
        },
        updateRepo: () => Effect.succeed(undefined),
      });
    }).pipe(Effect.provide(Database.layer(db)), runAndForwardErrors);

    expect(result.tasks).toBe(1);
    expect(updateIssueNumber).toBe(42);
    expect(updateIssueInput).toEqual({ title: 'Edited locally' });
    // Snapshot refreshed.
    const snapshots = (integration.snapshots ?? {}) as Record<string, any>;
    expect(snapshots['5678']?.title).toBe('Edited locally');
    void localTask;
  });

  test('snapshot-equal task is not pushed', async ({ expect }) => {
    const { db, integration } = await setup();

    Obj.update(integration, (integration) => {
      const m = integration as Obj.Mutable<typeof integration>;
      m.snapshots = {
        '5678': { title: 'Investigate flake', description: 'desc', status: 'todo' },
      };
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
      return yield* pushRepoUpdates(integration, repo(), new Map([['5678', issue()]]), {
        updateIssue: () => {
          calls++;
          return Effect.succeed(undefined);
        },
        updateRepo: () => Effect.succeed(undefined),
      });
    }).pipe(Effect.provide(Database.layer(db)), runAndForwardErrors);

    expect(result.tasks).toBe(0);
    expect(calls).toBe(0);
  });

  test('local status flip → PATCH state', async ({ expect }) => {
    const { db, integration } = await setup();

    Obj.update(integration, (integration) => {
      const m = integration as Obj.Mutable<typeof integration>;
      m.snapshots = {
        '5678': { title: 'Investigate flake', description: 'desc', status: 'todo' },
      };
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
      yield* pushRepoUpdates(integration, repo(), new Map([['5678', issue()]]), {
        updateIssue: (_owner, _repo, _num, input) => {
          updateIssueInput = input;
          return Effect.succeed(undefined);
        },
        updateRepo: () => Effect.succeed(undefined),
      });
    }).pipe(Effect.provide(Database.layer(db)), runAndForwardErrors);

    expect(updateIssueInput?.state).toBe('closed');
  });

  test('locally-edited repo description → PATCH /repos', async ({ expect }) => {
    const { db, integration } = await setup();

    Obj.update(integration, (integration) => {
      const m = integration as Obj.Mutable<typeof integration>;
      m.snapshots = {
        '1234': { name: 'dxos/composer', description: 'composer monorepo' },
      };
    });
    db.add(
      Obj.make(Project.Project, {
        [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: '1234' }] },
        name: 'dxos/composer',
        description: 'rewritten',
      }),
    );

    let updateRepoInput: GitHubApi.RepoUpdateInput | undefined;
    const result = await Effect.gen(function* () {
      return yield* pushRepoUpdates(integration, repo(), new Map(), {
        updateIssue: () => Effect.succeed(undefined),
        updateRepo: (_owner, _repo, input) => {
          updateRepoInput = input;
          return Effect.succeed(undefined);
        },
      });
    }).pipe(Effect.provide(Database.layer(db)), runAndForwardErrors);

    expect(result.projects).toBe(1);
    expect(updateRepoInput).toEqual({ description: 'rewritten' });
  });

  test('repo rename diverges locally → logged but NOT pushed', async ({ expect }) => {
    const { db, integration } = await setup();

    Obj.update(integration, (integration) => {
      const m = integration as Obj.Mutable<typeof integration>;
      m.snapshots = {
        '1234': { name: 'dxos/composer', description: 'composer monorepo' },
      };
    });
    db.add(
      Obj.make(Project.Project, {
        [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: '1234' }] },
        name: 'dxos/composer-renamed',
        description: 'composer monorepo',
      }),
    );

    let calls = 0;
    const result = await Effect.gen(function* () {
      return yield* pushRepoUpdates(integration, repo(), new Map(), {
        updateIssue: () => Effect.succeed(undefined),
        updateRepo: () => {
          calls++;
          return Effect.succeed(undefined);
        },
      });
    }).pipe(Effect.provide(Database.layer(db)), runAndForwardErrors);

    expect(result.projects).toBe(0);
    expect(calls).toBe(0);
  });

  test('soft-deleted local task is not pushed', async ({ expect }) => {
    const { db, integration } = await setup();

    Obj.update(integration, (integration) => {
      const m = integration as Obj.Mutable<typeof integration>;
      m.snapshots = {
        '5678': { title: 'orig', description: '', status: 'todo' },
      };
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
      return yield* pushRepoUpdates(integration, repo(), new Map([['5678', issue()]]), {
        updateIssue: () => {
          calls++;
          return Effect.succeed(undefined);
        },
        updateRepo: () => Effect.succeed(undefined),
      });
    }).pipe(Effect.provide(Database.layer(db)), runAndForwardErrors);

    expect(result.tasks).toBe(0);
    expect(calls).toBe(0);
  });
});
