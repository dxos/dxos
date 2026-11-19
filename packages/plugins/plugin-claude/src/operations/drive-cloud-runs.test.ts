//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Chat, TrajectoryStore } from '@dxos/assistant';
import * as Trace from '@dxos/compute/Trace';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
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

type Run = { chat: Chat.Chat; task: Task.Task; pullRequest: PullRequest.PullRequest };

/** Files a run: a chat with one task and one pull request the agent opened. */
const addRun = Effect.fn(function* (taskStatus: Task.Task['status'] = 'review') {
  const feed = yield* Database.add(Feed.make());
  const task = yield* Database.add(Task.make({ title: 'Ship it', status: taskStatus }));
  const chat = yield* Database.add(
    Chat.make({ feed: Ref.make(feed), session: { harness: CLAUDE_CODE_EDGE_AGENT }, tasks: [Ref.make(task)] }),
  );
  const pullRequest = yield* Database.add(
    PullRequest.make({ owner: 'dxos', repo: 'dxos', number: 1, title: 'Change', state: 'open' }),
  );
  return { chat, task, pullRequest } satisfies Run;
});

/**
 * A fake runner over `runs`; `folded` records every prompt the driver sent, and `settled` the chats whose pull requests were recorded.
 */
const makeRunner = (
  current: { status: Status },
  runs: readonly Run[],
  options: { running: boolean; onRead?: () => void },
) => {
  const folded: { prompt: string; windowMs: number }[] = [];
  const settled: string[] = [];
  const state = { running: options.running };
  const runOf = (chat: Chat.Chat): Run => {
    const run = runs.find((candidate) => candidate.chat.id === chat.id);
    if (!run) {
      throw new Error('unknown chat');
    }
    return run;
  };
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
    locate: (chat) => Effect.succeed([{ url: URL, pullRequest: Ref.make(runOf(chat).pullRequest) }]),
    readStatus: () =>
      Effect.sync(() => {
        options.onRead?.();
        return current.status;
      }),
    settle: (chat) =>
      Effect.sync(() => {
        const { task, pullRequest } = runOf(chat);
        settled.push(chat.id);
        // What recording a merged pull request does to its tasks.
        if (current.status.state === 'merged') {
          Obj.update(task, (task) => {
            task.status = 'done';
          });
        }
        return [{ url: URL, pullRequest: Ref.make(pullRequest) }];
      }),
  };
  return { runner, folded, settled, state };
};

/** A run whose turn has `running`. */
const setup = Effect.fn(function* (
  current: { status: Status },
  options: { running: boolean; taskStatus?: Task.Task['status'] },
) {
  const run = yield* addRun(options.taskStatus);
  return { ...run, ...makeRunner(current, [run], options) };
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

  it.live('asks the agent to fix a failed check, naming it, and again up to three times a commit', () => {
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

      // The turn ended without a push: the timer re-prompts, twice, then stops.
      expect((yield* driveRuns(runner)).runs.map(({ step }) => step)).toEqual(['fix']);
      expect(folded[1].prompt).toContain('attempt 2 of 3');
      expect((yield* driveRuns(runner)).runs.map(({ step }) => step)).toEqual(['fix']);
      expect((yield* driveRuns(runner)).runs.map(({ step }) => step)).toEqual(['idle']);
      expect(folded).toHaveLength(3);

      // The agent pushed and CI failed again on the new commit.
      current.status = { ...current.status, commit: 'def' };
      expect((yield* driveRuns(runner)).runs.map(({ step }) => step)).toEqual(['fix']);
      expect(folded).toHaveLength(4);
    }).pipe(Effect.scoped, Effect.provide(TestLayer));
  });

  it.live('lands an approved pull request, bounded, ignoring a failed Agentic Review', () => {
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
      expect((yield* driveRuns(runner)).runs.map(({ step }) => step)).toEqual(['land']);
      expect((yield* driveRuns(runner)).runs.map(({ step }) => step)).toEqual(['land']);
      expect((yield* driveRuns(runner)).runs.map(({ step }) => step)).toEqual(['idle']);
      expect(folded).toHaveLength(3);
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

  it.live('settles a pull request once, then again only when its commit or state moves', () => {
    const current = { status: status() };
    return Effect.gen(function* () {
      const { runner, settled } = yield* setup(current, { running: false });
      yield* driveRuns(runner);
      yield* driveRuns(runner);
      expect(settled).toHaveLength(1);

      current.status = { ...current.status, commit: 'def' };
      yield* driveRuns(runner);
      yield* driveRuns(runner);
      expect(settled).toHaveLength(2);

      current.status = status({ commit: 'def', state: 'closed' });
      yield* driveRuns(runner);
      expect(settled).toHaveLength(3);
    }).pipe(Effect.scoped, Effect.provide(TestLayer));
  });

  it.live('settles the tasks of a merged pull request to done, and then leaves the run alone', () => {
    const current = { status: status({ state: 'merged' }) };
    return Effect.gen(function* () {
      const { runner, task, settled } = yield* setup(current, { running: false });
      expect((yield* driveRuns(runner)).runs.map(({ step }) => step)).toEqual(['merged']);
      expect(task.status).toBe('done');
      expect((yield* driveRuns(runner)).runs).toEqual([]);
      expect(settled).toHaveLength(1);
    }).pipe(Effect.scoped, Effect.provide(TestLayer));
  });

  it.live('leaves runs beyond the time budget for the next tick, and drives them first then', () => {
    const current = { status: status() };
    const clock = { now: 1_000 };
    return Effect.gen(function* () {
      const runs = [yield* addRun(), yield* addRun(), yield* addRun()];
      const { runner, settled } = makeRunner(current, runs, {
        running: false,
        // Each run takes ten seconds of the budget.
        onRead: () => {
          clock.now += 10_000;
        },
      });
      const options = { concurrency: 1, budgetMs: 10_000, now: () => clock.now };

      const first = yield* driveRuns(runner, options);
      expect(first.runs.map(({ step }) => step)).toEqual(['idle', 'deferred', 'deferred']);
      const driven = [...settled];
      expect(driven).toHaveLength(1);

      // The two left over go first; the one driven already waits its turn.
      settled.length = 0;
      const second = yield* driveRuns(runner, options);
      expect(second.runs.map(({ step }) => step)).toEqual(['idle', 'deferred', 'deferred']);
      expect(settled).toHaveLength(1);
      expect(settled).not.toEqual(driven);
      expect(second.runs.at(-1)?.chat.target?.id).toBe(driven[0]);
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
