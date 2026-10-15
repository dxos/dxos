//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Trigger from '@dxos/compute/Trigger';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { PullRequest } from '@dxos/types';

import { GitHubOperation } from '#types';

import { REFRESH_CRON, ensureRefreshTrigger, queryInFlightPullRequests, selectRefreshBatch } from './refresh.ts';

describe('pull request refresh', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Trigger.Trigger, PullRequest.PullRequest]);
    return db;
  };

  const run = <T>(db: Database.Database, effect: Effect.Effect<T, never, Database.Service>) =>
    effect.pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

  test('a space gets one remote timer trigger, however often it is ensured', async ({ expect }) => {
    const db = await setup();
    const first = await run(db, ensureRefreshTrigger());
    const second = await run(db, ensureRefreshTrigger());

    expect(second.id).toBe(first.id);
    const triggers = await db.query(Filter.type(Trigger.Trigger)).run();
    expect(triggers).toHaveLength(1);
    expect(first.remote).toBe(true);
    expect(first.enabled).toBe(true);
    expect(first.spec).toEqual({ kind: 'timer', cron: REFRESH_CRON });
    expect(first.runnable?.uri).toBe(GitHubOperation.RefreshPullRequests.meta.key.toString());
  });

  test('a disabled refresh trigger is left disabled', async ({ expect }) => {
    const db = await setup();
    const trigger = await run(db, ensureRefreshTrigger());
    Obj.update(trigger, (trigger) => {
      trigger.enabled = false;
    });

    const ensured = await run(db, ensureRefreshTrigger());
    expect(ensured.id).toBe(trigger.id);
    expect(ensured.enabled).toBe(false);
  });

  test('only pull requests GitHub can still change are refreshed', async ({ expect }) => {
    const db = await setup();
    const make = (number: number, state: PullRequest.State) =>
      db.add(PullRequest.make({ owner: 'dxos', repo: 'dxos', number, title: `#${number}`, state }));
    make(1, 'open');
    make(2, 'draft');
    make(3, 'closed');
    make(4, 'merged');

    const inFlight = await run(db, queryInFlightPullRequests());
    expect(inFlight.map((pullRequest) => pullRequest.number).sort()).toEqual([1, 2]);
  });

  test('duplicates a racing peer created collapse to the lowest-id trigger', async ({ expect }) => {
    const db = await setup();
    const make = () =>
      db.add(
        Trigger.make({
          enabled: true,
          remote: true,
          spec: Trigger.specTimer(REFRESH_CRON),
          runnable: Ref.fromURI(GitHubOperation.RefreshPullRequests.meta.key),
          input: {},
        }),
      );
    const ids = [make().id, make().id].sort();

    const kept = await run(db, ensureRefreshTrigger());
    expect(kept.id).toBe(ids[0]);
    const triggers = await db.query(Filter.type(Trigger.Trigger)).run();
    expect(triggers.map((trigger) => trigger.id)).toEqual([ids[0]]);
  });

  test('successive runs walk every open pull request in bounded batches', async ({ expect }) => {
    const db = await setup();
    const pullRequests = Array.from({ length: 5 }, (_, index) =>
      db.add(PullRequest.make({ owner: 'dxos', repo: 'dxos', number: index, title: `#${index}`, state: 'open' })),
    );

    expect(selectRefreshBatch(pullRequests, 0, 10)).toHaveLength(5);
    const seen = new Set<string>();
    for (let window = 0; window < 3; window++) {
      const batch = selectRefreshBatch(pullRequests, window, 2);
      expect(batch).toHaveLength(2);
      batch.forEach((pullRequest) => seen.add(pullRequest.id));
    }
    expect(seen.size).toBe(5);
  });
});
