//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Chat, TrajectoryStore } from '@dxos/assistant';
import * as Trace from '@dxos/compute/Trace';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { PullRequest, Task } from '@dxos/types';

import { CloudRunOperation } from '#types';

import { CLAUDE_CODE_EDGE_AGENT } from '../constants.ts';
import { type Runner, driveRuns } from './drive-cloud-runs.ts';
import { type PullRequestStatusLike } from './drive-decision.ts';
import { ensureDriveTrigger } from './drive-trigger.ts';

type Status = PullRequestStatusLike;

const URL = 'https://github.com/dxos/dxos/pull/1';

const status = (overrides: Partial<Status> = {}): Status => ({
  state: 'open',
  commit: 'abc',
  runs: [],
  review: 'none',
  labels: [],
  ...overrides,
});

const TestLayer = Layer.mergeAll(
  TestDatabaseLayer({
    types: [Feed.Feed, ...TrajectoryStore.types, Chat.Chat, Task.Task, PullRequest.PullRequest, Trigger.Trigger],
  }),
  Layer.succeed(Trace.TraceService, { write: () => {} }),
);

/** A run whose turn has `running`; `folded` records every prompt the driver sent. */
const setup = Effect.fn(function* (
  current: { status: Status },
  options: { running: boolean; taskStatus?: Task.Task['status'] },
) {
  const feed = yield* Database.add(Feed.make());
  const task = yield* Database.add(Task.make({ title: 'Ship it', status: options.taskStatus ?? 'review' }));
  const chat = yield* Database.add(
    Chat.make({ feed: Ref.make(feed), session: { harness: CLAUDE_CODE_EDGE_AGENT }, tasks: [Ref.make(task)] }),
  );
  const pullRequest = yield* Database.add(
    PullRequest.make({ owner: 'dxos', repo: 'dxos', number: 1, title: 'Change', state: 'open' }),
  );
  const folded: { prompt: string; windowMs: number }[] = [];
  const state = { running: options.running };
  const runner: Runner<never> = {
    isRunning: () => state.running,
    fold: (_chat, prompt, windowMs) =>
      Effect.sync(() => {
        folded.push({ prompt, windowMs });
        return { done: prompt !== '' || !state.running };
      }),
    followUp: (_chat, prompt, windowMs) =>
      Effect.sync(() => {
        folded.push({ prompt, windowMs });
      }),
    readStatus: () => Effect.succeed(current.status),
    settle: () => Effect.succeed([{ url: URL, pullRequest: Ref.make(pullRequest) }]),
  };
  return { chat, task, runner, folded, state };
});

describe('driveRuns', () => {
  it.live('folds a running turn with a short window and acts on nothing else', () => {
    const current = { status: status({ review: 'approved' }) };
    return Effect.gen(function* () {
      const { runner, folded } = yield* setup(current, { running: true });
      const { runs } = yield* driveRuns(runner);
      expect(runs.map(({ step }) => step)).toEqual(['running']);
      expect(folded).toEqual([{ prompt: '', windowMs: 5_000 }]);
    }).pipe(Effect.scoped, Effect.provide(TestLayer));
  });

  it.live('asks the agent to fix a failed check, naming it, and only once', () => {
    const current = {
      status: status({
        runs: [{ name: 'build', outcome: 'failure', url: 'https://ci/1' }],
      }),
    };
    return Effect.gen(function* () {
      const { runner, folded } = yield* setup(current, { running: false });
      expect((yield* driveRuns(runner)).runs.map(({ step }) => step)).toEqual(['fix']);
      expect(folded).toHaveLength(1);
      expect(folded[0].prompt).toContain('build: https://ci/1');

      // The timer fires again with nothing changed.
      expect((yield* driveRuns(runner)).runs.map(({ step }) => step)).toEqual(['idle']);
      expect(folded).toHaveLength(1);

      // The agent pushed and CI failed again on the new commit.
      current.status = { ...current.status, commit: 'def' };
      expect((yield* driveRuns(runner)).runs.map(({ step }) => step)).toEqual(['fix']);
      expect(folded).toHaveLength(2);
    }).pipe(Effect.scoped, Effect.provide(TestLayer));
  });

  it.live('lands an approved pull request once, ignoring a failed Agentic Review', () => {
    const current = {
      status: status({
        runs: [{ name: 'Agentic Review', outcome: 'failure' }],
        labels: ['land'],
      }),
    };
    return Effect.gen(function* () {
      const { runner, folded } = yield* setup(current, { running: false });
      expect((yield* driveRuns(runner)).runs.map(({ step }) => step)).toEqual(['land']);
      expect(folded[0].prompt).toContain('gh pr merge --auto --squash');
      expect((yield* driveRuns(runner)).runs.map(({ step }) => step)).toEqual(['idle']);
      expect(folded).toHaveLength(1);
    }).pipe(Effect.scoped, Effect.provide(TestLayer));
  });

  it.live('does nothing for a pull request nobody approved, and notes a merge', () => {
    const current = { status: status() };
    return Effect.gen(function* () {
      const { runner, folded } = yield* setup(current, { running: false });
      expect((yield* driveRuns(runner)).runs.map(({ step }) => step)).toEqual(['idle']);
      current.status = status({ state: 'merged' });
      expect((yield* driveRuns(runner)).runs.map(({ step }) => step)).toEqual(['merged']);
      expect(folded).toEqual([]);
    }).pipe(Effect.scoped, Effect.provide(TestLayer));
  });

  it.live('skips runs whose tasks are settled', () => {
    const current = { status: status({ review: 'approved' }) };
    return Effect.gen(function* () {
      const { runner } = yield* setup(current, { running: false, taskStatus: 'done' });
      expect((yield* driveRuns(runner)).runs).toEqual([]);
    }).pipe(Effect.scoped, Effect.provide(TestLayer));
  });
});

describe('ensureDriveTrigger', () => {
  it.live('files one five-minute timer trigger for the drive operation, however often it is asked', () =>
    Effect.gen(function* () {
      const first = yield* ensureDriveTrigger();
      const second = yield* ensureDriveTrigger();
      expect(second.id).toBe(first.id);
      const triggers = yield* Database.query(Filter.type(Trigger.Trigger)).run;
      expect(triggers).toHaveLength(1);
      expect(triggers[0].spec).toEqual({ kind: 'timer', cron: '*/5 * * * *' });
      expect(triggers[0].runnable?.uri).toBe(CloudRunOperation.DriveCloudRuns.meta.key.toString());
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );
});
