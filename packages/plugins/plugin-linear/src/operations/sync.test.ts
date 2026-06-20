//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Integration } from '@dxos/plugin-integration';
import { AccessToken, Project, Task } from '@dxos/types';

import { LINEAR_SOURCE } from '../constants';
import { LinearApi } from '../services';
import { pushTeamUpdates, upsertProject, upsertTask } from './sync';

const issue = (overrides: Partial<LinearApi.Issue> = {}): LinearApi.Issue => ({
  id: 'issue-1',
  identifier: 'TEAM-1',
  title: 'Investigate flake',
  description: 'desc',
  priority: 3,
  estimate: 2,
  state: { id: 'st-1', name: 'In Progress', type: 'started' },
  assignee: undefined,
  project: undefined,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
  ...overrides,
});

const project = (overrides: Partial<LinearApi.Project> = {}): LinearApi.Project => ({
  id: 'proj-1',
  name: 'Q2 launch',
  description: 'high level scope',
  ...overrides,
});

describe('plugin-linear sync', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([AccessToken.AccessToken, Integration.Integration, Project.Project, Task.Task]);
    const token = db.add(Obj.make(AccessToken.AccessToken, { source: LINEAR_SOURCE, token: 'tok' }));
    const integration = db.add(Obj.make(Integration.Integration, { accessToken: Ref.make(token), targets: [] }));
    return { db, integration };
  };

  test('first pull seeds snapshot and creates a Task', async ({ expect }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);

    const result = await Effect.gen(function* () {
      return yield* upsertTask(integration, issue(), undefined);
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    expect(result.created).toBe(true);
    const snapshots = (integration.snapshots ?? {}) as Record<string, any>;
    expect(snapshots['issue-1']?.title).toBe('Investigate flake');
    expect(snapshots['issue-1']?.status).toBe('in-progress');
    expect(snapshots['issue-1']?.priority).toBe('medium');
    expect(result.task.title).toBe('Investigate flake');
  });

  test('second pull is idempotent (no changes either side)', async ({ expect }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);

    await Effect.gen(function* () {
      yield* upsertTask(integration, issue(), undefined);
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    const second = await Effect.gen(function* () {
      return yield* upsertTask(integration, issue(), undefined);
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    expect(second.created).toBe(false);
    // Title still correct, no field flipping.
    expect(second.task.title).toBe('Investigate flake');
  });

  test('local-only edit is preserved across pull', async ({ expect }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);

    const first = await Effect.gen(function* () {
      return yield* upsertTask(integration, issue(), undefined);
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    Obj.update(first.task, (task) => {
      task.description = 'edited locally';
    });

    // Pull again with unchanged remote — local edit must survive.
    await Effect.gen(function* () {
      yield* upsertTask(integration, issue(), undefined);
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    expect(first.task.description).toBe('edited locally');
  });

  test('remote-only change pulls into local and refreshes snapshot', async ({ expect }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);

    await Effect.gen(function* () {
      yield* upsertTask(integration, issue(), undefined);
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    const second = await Effect.gen(function* () {
      return yield* upsertTask(integration, issue({ title: 'Renamed remotely' }), undefined);
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    expect(second.task.title).toBe('Renamed remotely');
    const snapshots = (integration.snapshots ?? {}) as Record<string, any>;
    expect(snapshots['issue-1']?.title).toBe('Renamed remotely');
  });

  test('both-changed → remote wins (conflict policy)', async ({ expect }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);

    const first = await Effect.gen(function* () {
      return yield* upsertTask(integration, issue({ description: 'orig' }), undefined);
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    Obj.update(first.task, (task) => {
      task.description = 'local edit';
    });

    await Effect.gen(function* () {
      yield* upsertTask(integration, issue({ description: 'remote edit' }), undefined);
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    expect(first.task.description).toBe('remote edit');
  });

  test('push: locally-edited title PATCHes only diverged fields', async ({ expect }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);

    const first = await Effect.gen(function* () {
      return yield* upsertTask(integration, issue(), undefined);
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    Obj.update(first.task, (task) => {
      task.title = 'Edited locally';
    });

    let issueUpdateInput: LinearApi.IssueUpdateInput | undefined;
    const result = await Effect.gen(function* () {
      return yield* pushTeamUpdates(integration, new Map([['issue-1', issue()]]), new Map(), {
        updateIssue: (_id, input) => {
          issueUpdateInput = input;
          return Effect.succeed(undefined);
        },
        updateProject: () => Effect.succeed(undefined),
        resolveStateId: () => undefined,
      });
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    expect(result.tasks).toBe(1);
    expect(issueUpdateInput).toEqual({ title: 'Edited locally' });
    // Snapshot refreshed so a subsequent push is a no-op.
    const snapshots = (integration.snapshots ?? {}) as Record<string, any>;
    expect(snapshots['issue-1']?.title).toBe('Edited locally');
  });

  test('push: snapshot-equal task is not pushed (no bouncing)', async ({ expect }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);

    await Effect.gen(function* () {
      yield* upsertTask(integration, issue(), undefined);
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    let calls = 0;
    const result = await Effect.gen(function* () {
      return yield* pushTeamUpdates(integration, new Map([['issue-1', issue()]]), new Map(), {
        updateIssue: () => {
          calls++;
          return Effect.succeed(undefined);
        },
        updateProject: () => Effect.succeed(undefined),
        resolveStateId: () => undefined,
      });
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    expect(result.tasks).toBe(0);
    expect(calls).toBe(0);
  });

  test('push: status divergence resolves to a Linear stateId', async ({ expect }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);

    const first = await Effect.gen(function* () {
      return yield* upsertTask(integration, issue(), undefined);
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    Obj.update(first.task, (task) => {
      task.status = 'done';
    });

    let issueUpdateInput: LinearApi.IssueUpdateInput | undefined;
    await Effect.gen(function* () {
      yield* pushTeamUpdates(integration, new Map([['issue-1', issue()]]), new Map(), {
        updateIssue: (_id, input) => {
          issueUpdateInput = input;
          return Effect.succeed(undefined);
        },
        updateProject: () => Effect.succeed(undefined),
        resolveStateId: (_iss, status) => (status === 'done' ? 'state-completed-id' : undefined),
      });
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    expect(issueUpdateInput?.stateId).toBe('state-completed-id');
  });

  test('push: priority assigned to previously-unprioritised issue is pushed', async ({ expect }) => {
    // Regression: an earlier guard `snapshot.priority !== undefined` silently
    // dropped pushes when the remote had no priority — exactly the common
    // "user sets a priority on a freshly-pulled issue" case.
    const { db, integration } = await setup();
    const layer = Database.layer(db);

    const first = await Effect.gen(function* () {
      return yield* upsertTask(integration, issue({ priority: 0 }), undefined);
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    // Sanity check: the seeded snapshot really does say "no priority".
    const snapshots = (integration.snapshots ?? {}) as Record<string, any>;
    expect(snapshots['issue-1']?.priority).toBeUndefined();

    Obj.update(first.task, (task) => {
      task.priority = 'medium';
    });

    let issueUpdateInput: LinearApi.IssueUpdateInput | undefined;
    await Effect.gen(function* () {
      yield* pushTeamUpdates(integration, new Map([['issue-1', issue({ priority: 0 })]]), new Map(), {
        updateIssue: (_id, input) => {
          issueUpdateInput = input;
          return Effect.succeed(undefined);
        },
        updateProject: () => Effect.succeed(undefined),
        resolveStateId: () => undefined,
      });
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    // Linear maps medium → 3.
    expect(issueUpdateInput?.priority).toBe(3);
  });

  test('push: locally clearing priority sends null to Linear', async ({ expect }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);

    const first = await Effect.gen(function* () {
      return yield* upsertTask(integration, issue(), undefined);
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    Obj.update(first.task, (task) => {
      task.priority = undefined;
    });

    let issueUpdateInput: LinearApi.IssueUpdateInput | undefined;
    await Effect.gen(function* () {
      yield* pushTeamUpdates(integration, new Map([['issue-1', issue()]]), new Map(), {
        updateIssue: (_id, input) => {
          issueUpdateInput = input;
          return Effect.succeed(undefined);
        },
        updateProject: () => Effect.succeed(undefined),
        resolveStateId: () => undefined,
      });
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    expect(issueUpdateInput?.priority).toBeNull();
  });

  test('pull: local priority on previously-unprioritised issue survives re-pull', async ({ expect }) => {
    // Regression: when remote priority is undefined and snapshot.priority is
    // also undefined (a *recorded* "no priority"), the merge must not treat
    // it as "first sync" and clobber the user's local edit. This is the bug
    // path that motivated the snapshotField/Snapshot wrapper API in
    // app-toolkit/integration-sync.
    const { db, integration } = await setup();
    const layer = Database.layer(db);

    // First pull: Linear says "no priority" (0 → undefined via the mapper).
    const first = await Effect.gen(function* () {
      return yield* upsertTask(integration, issue({ priority: 0 }), undefined);
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    // User assigns priority locally.
    Obj.update(first.task, (task) => {
      task.priority = 'medium';
    });
    expect(first.task.priority).toBe('medium');

    // Second pull with unchanged remote (still no priority). The local edit
    // must survive.
    await Effect.gen(function* () {
      yield* upsertTask(integration, issue({ priority: 0 }), undefined);
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    expect(first.task.priority).toBe('medium');
  });

  test('push: project description divergence calls updateProject', async ({ expect }) => {
    const { db, integration } = await setup();
    const layer = Database.layer(db);

    const { project: local } = await Effect.gen(function* () {
      return yield* upsertProject(integration, project());
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    Obj.update(local, (local) => {
      local.description = 'rewritten';
    });

    let projectInput: LinearApi.ProjectUpdateInput | undefined;
    const result = await Effect.gen(function* () {
      return yield* pushTeamUpdates(integration, new Map(), new Map([['proj-1', project()]]), {
        updateIssue: () => Effect.succeed(undefined),
        updateProject: (_id, input) => {
          projectInput = input;
          return Effect.succeed(undefined);
        },
        resolveStateId: () => undefined,
      });
    }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);

    expect(result.projects).toBe(1);
    expect(projectInput).toEqual({ description: 'rewritten' });
  });
});
