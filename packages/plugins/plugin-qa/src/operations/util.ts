//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Feed, Filter } from '@dxos/echo';

import { type TestCase, type TestPlan, TestRun } from '#types';

/** Resolves a plan's cases, in the plan's own order. */
export const loadCases = (plan: TestPlan.TestPlan): Effect.Effect<TestCase.TestCase[], Error, Database.Service> =>
  Effect.forEach(plan.cases, (ref) => Database.load(ref));

/** Finds a plan's case by its human key, or undefined when the plan does not carry it. */
export const findCase = (
  plan: TestPlan.TestPlan,
  key: string,
): Effect.Effect<TestCase.TestCase | undefined, Error, Database.Service> =>
  Effect.map(loadCases(plan), (cases) => cases.find((testCase) => testCase.key === key));

/** The plan's run feed. */
export const loadFeed = (plan: TestPlan.TestPlan): Effect.Effect<Feed.Feed, Error, Database.Service> =>
  Database.load(plan.feed);

/** The plan's runs, newest first — the feed appends in execution order. */
export const loadRuns = (plan: TestPlan.TestPlan): Effect.Effect<TestRun.TestRun[], Error, Database.Service> =>
  Effect.gen(function* () {
    const feed = yield* loadFeed(plan);
    const runs = yield* Feed.query(feed, Filter.type(TestRun.TestRun)).run;
    return [...runs].reverse();
  });
