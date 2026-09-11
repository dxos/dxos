//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import { FeedTraceSink } from '@dxos/compute-runtime';
import { Database, type Query } from '@dxos/echo';

import { type ToolInvocation, toolInvocations } from './assertions.ts';

/**
 * What a scorer's query may reach: the space the session worked in, the trace feed its tools were
 * written to, and the runtime's operations — the same surface the run itself had, while it is still
 * open. A scorer is therefore written against the database rather than against a blob of state some
 * earlier pass had to anticipate.
 */
export type Services = Database.Service | FeedTraceSink.FeedTraceSink | Capabilities.ProcessManagerRuntimeServices;

/** What the run contributes, for a scorer grading the session rather than what it left behind. */
export type Run = {
  readonly durationMillis: number;
};

/** A scorer's verdict: a fraction of a mark, or a flag read as one or zero. */
export type Result = number | boolean;

/**
 * One graded dimension: a query run against the live space, and a verdict on what it returned. The
 * two halves are separate so the query's value can be reported next to the score — a reader of a
 * run needs what the session left, not only the mark it earned for it.
 */
export type Scorer<A> = {
  readonly name: string;
  readonly description?: string;
  readonly query: Effect.Effect<A, unknown, Services>;
  readonly score: (value: A, run: Run) => Result;
};

export type Any = Scorer<any>;

/** A scored dimension, as the task reports it: the mark, the value it was read from, or the failure. */
export type Score = {
  readonly score: number;
  readonly value?: unknown;
  readonly error?: string;
};

export type Scores = Record<string, Score>;

/**
 * Per-run memo for the queries several scorers share, keyed by the query effect itself. Variants of
 * one eval run concurrently in one process, so the cache is the run's and never the module's.
 */
class Memo extends Context.Service<Memo, { readonly cache: Map<unknown, Exit.Exit<any, any>> }>()(
  '@dxos/assistant-evals/Scorer/Memo',
) {}

/**
 * The base case: a scorer that reads nothing of the space, only what the run itself reports. Given
 * a `query`, the query's value is what the verdict reads instead.
 */
export const make: {
  <A, E, R extends Services>(options: {
    name: string;
    description?: string;
    query: Effect.Effect<A, E, R>;
    score: (value: A, run: Run) => Result;
  }): Scorer<A>;
  (options: { name: string; description?: string; score: (run: Run) => Result }): Scorer<void>;
} = (
  options:
    | {
        name: string;
        description?: string;
        query: Effect.Effect<unknown, unknown, Services>;
        // Method syntax: the verdict is written against the query's own value, so the two halves
        // are checked bivariantly here rather than against this erased shape.
        score(value: unknown, run: Run): Result;
      }
    | { name: string; description?: string; score(run: Run): Result },
): Any => {
  const { name, description } = options;
  return 'query' in options
    ? { name, description, query: options.query, score: (value, run) => options.score(value, run) }
    : { name, description, query: Effect.void, score: (_value, run) => options.score(run) };
};

/**
 * A scorer over an ECHO query: the query runs against the session's space and its results are the
 * only thing the verdict sees.
 */
export const database = <Q extends Query.Any>(options: {
  name: string;
  description?: string;
  query: Q;
  score: (results: readonly Query.Type<Q>[], run: Run) => Result;
}): Scorer<readonly Query.Type<Q>[]> => {
  const query: Effect.Effect<readonly Query.Type<Q>[], unknown, Services> = Database.query(options.query).run;
  return make({
    name: options.name,
    description: options.description,
    query,
    score: options.score,
  });
};

/**
 * The tool calls the session made, paired with their results, in order. One effect value shared by
 * every scorer that reads it, so the feed is read once per run.
 */
export const invocations: Effect.Effect<readonly ToolInvocation[], unknown, Services> = toolInvocations();

/** A scorer over the tool calls the session made. */
export const toolCalls = (options: {
  name: string;
  description?: string;
  score: (invocations: readonly ToolInvocation[], run: Run) => Result;
}): Scorer<readonly ToolInvocation[]> =>
  make({
    name: options.name,
    description: options.description,
    query: invocations,
    score: options.score,
  });

/**
 * A scorer over the session's wall clock: full marks up to `targetMinutes`, falling linearly to
 * nothing at `budgetMinutes`. `when` gates it, so a run that never produced the thing being timed
 * scores nothing rather than being rewarded for stopping early.
 */
export const duration = <A, E, R extends Services>(options: {
  name: string;
  description?: string;
  targetMinutes: number;
  budgetMinutes: number;
  when: Effect.Effect<A, E, R>;
  delivered: (value: A) => boolean;
}): Scorer<A> =>
  make({
    name: options.name,
    description: options.description,
    query: options.when,
    score: (value, { durationMillis }) => {
      if (!options.delivered(value)) {
        return 0;
      }
      const minutes = durationMillis / 60_000;
      return (options.budgetMinutes - minutes) / (options.budgetMinutes - options.targetMinutes);
    },
  });

/** Booleans are a mark or none; fractions are clamped, so a scorer cannot spend more than its one. */
const normalize = (result: Result): number =>
  typeof result === 'boolean' ? (result ? 1 : 0) : Math.max(0, Math.min(1, Number.isFinite(result) ? result : 0));

const describe = (cause: Cause.Cause<unknown>): string => Cause.pretty(cause);

/**
 * Runs each distinct query at most once per run, keyed by the effect itself: scorers that read the
 * same value share one answer, and an expensive probe is not paid for by each of them. The exit,
 * not the value: a shared query that failed has still been asked, and re-asking it would run the
 * probe again and report a different answer to each scorer.
 */
const memoized = <A>(query: Effect.Effect<A, unknown, Services>): Effect.Effect<A, unknown, Services | Memo> =>
  Effect.gen(function* () {
    const { cache } = yield* Memo;
    const cached = cache.get(query);
    if (cached !== undefined) {
      return yield* cached;
    }
    const exit = yield* Effect.exit(query);
    cache.set(query, exit);
    return yield* exit;
  });

/**
 * Scores every dimension against the open space, in order, sharing the answer to any query more
 * than one of them names. A query that fails scores nothing and reports why, rather than failing
 * the run: a scorer reading state a timed-out session never reached is a result, not an error.
 */
export const runAll = (scorers: readonly Any[], run: Run): Effect.Effect<Scores, never, Services> =>
  Effect.gen(function* () {
    const scores: Record<string, Score> = {};
    for (const scorer of scorers) {
      // The verdict runs inside the same boundary as the query: a scorer that throws on an
      // unexpected shape scores nothing and says so, rather than taking the other nine with it.
      const exit = yield* Effect.exit(
        memoized(scorer.query).pipe(
          Effect.flatMap((value) =>
            Effect.try(() => normalize(scorer.score(value, run))).pipe(Effect.map((score) => ({ score, value }))),
          ),
        ),
      );
      scores[scorer.name] = Exit.isSuccess(exit) ? exit.value : { score: 0, error: describe(exit.cause) };
    }
    return scores;
  }).pipe(Effect.provideService(Memo, { cache: new Map<unknown, Exit.Exit<any, any>>() }));

/** The evalite side of the same list: each dimension reads the mark the run already recorded. */
export const toEvalite = (scorers: readonly Any[]) =>
  scorers.map(({ name, description }) => ({
    name,
    description,
    scorer: ({ output }: { output: { scores: Scores } }) => output.scores[name]?.score ?? 0,
  }));
