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

/** What the run itself contributes, for a scorer grading the session rather than what it left. */
export class Run extends Context.Service<Run, { readonly durationMillis: number }>()(
  '@dxos/assistant-evals/Scorer/Run',
) {}

/**
 * Per-run memo for the work several scorers share (see {@link shared}). Variants of one eval run
 * concurrently in one process, so the cache is the run's and never the module's.
 */
export class Memo extends Context.Service<Memo, { readonly cache: Map<unknown, Exit.Exit<any, any>> }>()(
  '@dxos/assistant-evals/Scorer/Memo',
) {}

/**
 * What a scorer may reach: the space the session worked in, the trace feed its tools were written
 * to, the runtime's operations — the same surface the run itself had, while it is still open — plus
 * what the run reports about itself. A scorer is therefore written against the database rather than
 * against a blob of state some earlier pass had to anticipate.
 */
export type Services =
  | Database.Service
  | FeedTraceSink.FeedTraceSink
  | Capabilities.ProcessManagerRuntimeServices
  | Run
  | Memo;

/** A scorer's verdict: a fraction of a mark, or a flag read as one or zero. */
export type Result = number | boolean;

/**
 * One graded dimension: an effect that reads whatever it needs of the open run and returns the mark
 * for it. Reading and judging are one step, so a dimension is a single self-contained value that can
 * be moved or deleted without disturbing anything else.
 */
export type Scorer = {
  readonly name: string;
  readonly description?: string;
  readonly score: Effect.Effect<Result, unknown, Services>;
};

export type Any = Scorer;

/** A scored dimension, as a run reports it: the mark, or the failure that stood in for one. */
export type Score = {
  readonly score: number;
  readonly error?: string;
};

export type Scores = Record<string, Score>;

/** The base case: the scorer is its effect. */
export const make = (options: {
  name: string;
  description?: string;
  score: Effect.Effect<Result, unknown, Services>;
}): Scorer => options;

/**
 * Runs `effect` at most once per run, keyed by the effect itself, so scorers reading the same thing
 * share one answer and an expensive probe is not paid for by each of them. The exit, not the value:
 * a shared effect that failed has still been asked, and asking it again would run the probe a second
 * time and report a different answer to each scorer. Sound because a run's dimensions are graded one
 * at a time (see {@link Session}), so there is never a second caller to join a call in flight.
 */
export const shared = <A, E, R extends Services>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R | Memo> =>
  Effect.gen(function* () {
    const { cache } = yield* Memo;
    const cached = cache.get(effect);
    if (cached !== undefined) {
      return yield* cached as Exit.Exit<A, E>;
    }
    const exit = yield* Effect.exit(effect);
    cache.set(effect, exit);
    return yield* exit;
  });

/** A scorer over an ECHO query: the query runs against the session's space, and its results are judged. */
export const database = <Q extends Query.Any>(options: {
  name: string;
  description?: string;
  query: Q;
  score: (results: readonly Query.Type<Q>[]) => Result;
}): Scorer =>
  make({
    name: options.name,
    description: options.description,
    score: Database.query(options.query).run.pipe(Effect.map(options.score)),
  });

/**
 * The tool calls the session made, paired with their results, in order. Shared, so the feed is read
 * once per run however many scorers name it.
 */
export const invocations: Effect.Effect<readonly ToolInvocation[], unknown, Services> = shared(toolInvocations());

/** A scorer over the tool calls the session made. */
export const toolCalls = (options: {
  name: string;
  description?: string;
  score: (invocations: readonly ToolInvocation[]) => Result;
}): Scorer =>
  make({
    name: options.name,
    description: options.description,
    score: invocations.pipe(Effect.map(options.score)),
  });

/**
 * A scorer over the session's wall clock: full marks up to `targetMinutes`, falling linearly to
 * nothing at `budgetMinutes`. `delivered` gates it, so a run that never produced the thing being
 * timed scores nothing rather than being rewarded for stopping early.
 */
export const duration = (options: {
  name: string;
  description?: string;
  targetMinutes: number;
  budgetMinutes: number;
  delivered: Effect.Effect<boolean, unknown, Services>;
}): Scorer =>
  make({
    name: options.name,
    description: options.description,
    score: Effect.gen(function* () {
      if (!(yield* options.delivered)) {
        return 0;
      }
      const { durationMillis } = yield* Run;
      const minutes = durationMillis / 60_000;
      return (options.budgetMinutes - minutes) / (options.budgetMinutes - options.targetMinutes);
    }),
  });

/** Booleans are a mark or none; fractions are clamped, so a scorer cannot spend more than its one. */
const normalize = (result: Result): number =>
  typeof result === 'boolean' ? (result ? 1 : 0) : Math.max(0, Math.min(1, Number.isFinite(result) ? result : 0));

const describe = (cause: Cause.Cause<unknown>): string => Cause.pretty(cause);

/**
 * A run whose space is still open. The harness is disposed by the eval's `afterAll` (see
 * `runner.ts`) rather than when the task returns, because evalite runs a row's scorers inside that
 * row's own test, after the task and before the file ends — so a scorer reads what the session
 * actually left instead of a snapshot an earlier pass had to anticipate.
 */
export type Session = {
  /** Runs a scorer inside the run's own harness, with its space and its {@link Run} provided. */
  readonly grade: (scorer: Scorer) => Promise<Exit.Exit<Result, unknown>>;
};

/**
 * The open sessions, by the id their task reported. Module-level because the scorers run outside the
 * task that opened the session, and evalite hands them nothing but that task's output.
 */
const sessions = new Map<string, Session>();

export const openSession = (id: string, session: Session): void => {
  sessions.set(id, session);
};

export const closeSession = (id: string): void => {
  sessions.delete(id);
};

/**
 * What a session provides its scorers beyond the space itself: what the run reports about its own
 * wall clock, and the memo the shared reads of that run agree on.
 */
export const sessionServices = (run: { durationMillis: number }) => {
  const cache = new Map<unknown, Exit.Exit<any, any>>();
  return <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, Exclude<R, Run | Memo>> =>
    effect.pipe(
      Effect.provideService(Run, { durationMillis: run.durationMillis }),
      Effect.provideService(Memo, { cache }),
    ) as Effect.Effect<A, E, Exclude<R, Run | Memo>>;
};

/**
 * Scores every dimension in order against the open space. A scorer that fails scores nothing and
 * reports why, rather than failing the run: one reading state a timed-out session never reached is a
 * result, not an error, and must not take the other nine with it.
 */
export const runAll = (scorers: readonly Any[]): Effect.Effect<Scores, never, Services> =>
  Effect.gen(function* () {
    const scores: Record<string, Score> = {};
    for (const scorer of scorers) {
      // `Effect.try` around the verdict too: a scorer that throws on an unexpected shape scores
      // nothing and says so.
      const exit = yield* Effect.exit(
        scorer.score.pipe(Effect.flatMap((result) => Effect.try(() => normalize(result)))),
      );
      scores[scorer.name] = Exit.isSuccess(exit) ? { score: exit.value } : { score: 0, error: describe(exit.cause) };
    }
    return scores;
  });

/** What a graded task hands its scorers: a session to grade against, or the marks it already recorded. */
type Graded = { readonly runId?: string; readonly scores?: Scores };

/**
 * The evalite side of the same list, so a dimension is declared once and wired once.
 *
 * A run that left its space open is graded here, against that space. A staged run has none left to
 * ask — `claude-harness` disposes its own harness, because the facts it scores are only true between
 * two of its turns — so it records its marks with {@link runAll} and they are read back instead.
 */
export const toEvalite = (scorers: readonly Any[]) =>
  scorers.map((scorer) => ({
    name: scorer.name,
    description: scorer.description,
    scorer: async ({ output }: { output: Graded }) => {
      const session = output?.runId === undefined ? undefined : sessions.get(output.runId);
      if (!session) {
        const recorded = output?.scores?.[scorer.name];
        return { score: recorded?.score ?? 0, metadata: { error: recorded?.error } };
      }
      const exit = await session.grade(scorer);
      return Exit.isSuccess(exit)
        ? { score: normalize(exit.value), metadata: {} }
        : { score: 0, metadata: { error: describe(exit.cause) } };
    },
  }));
