//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Database, Obj } from '@dxos/echo';

import * as Operation from './Operation.ts';
import * as Script from './types/Script.ts';

/**
 * A script that could not be run: an unsupported dialect, a source that would not resolve, or a
 * runtime that refused the request.
 *
 * A failure the SCRIPT raised is not one of these — that is a {@link Result} carrying `error`, since
 * the caller (a model writing code, a person at `dx eval`) is meant to read it and write different
 * code rather than see the call fail.
 */
export class RunnerError extends Schema.TaggedError<RunnerError>('ScriptRunnerError')('ScriptRunnerError', {
  message: Schema.String,
  dialect: Schema.optional(Operation.Dialect),
}) {}

/** The host calls one run made: how many, and the wall time spent waiting on them. */
export const Stats = Schema.Struct({
  calls: Schema.Number,
  callMs: Schema.Number,
});
export type Stats = Schema.Schema.Type<typeof Stats>;

/**
 * One execution request.
 *
 * Fully serializable — the source is data and every option is a scalar — so the same request runs
 * in this process, on a worker, or on EDGE without being rebuilt. What a request cannot carry is the
 * workspace: the bindings the code runs against are the runner's, built wherever the runner lives.
 */
export const Request = Schema.Struct({
  source: Operation.ScriptSource,
  /**
   * Input handed to the script, bound under `input` by a backend whose dialect can carry it. A
   * backend that evaluates out of process builds its bindings on the far side and may not, so a
   * script that must have its input should read it from the database instead.
   */
  input: Schema.optional(Schema.Unknown),
  /** Space the script's calls default to; absent runs against the runner's own default. */
  spaceId: Schema.optional(Schema.String),
  /** Wall-clock bound on the run, in milliseconds. */
  timeoutMs: Schema.optional(Schema.Number),
  /** Characters of printed output returned before truncation. */
  maxOutput: Schema.optional(Schema.Number),
  /** Skill tokens the caller already holds, which the script's `invoke` presents for it. */
  skillTokens: Schema.optional(Schema.Array(Schema.String)),
});
export type Request = Schema.Schema.Type<typeof Request>;

/** What a run produced: what it printed, why it failed when it did, and the calls it made. */
export const Result = Schema.Struct({
  output: Schema.String,
  /** Present exactly when the script itself failed; `output` then holds what it printed first. */
  error: Schema.optional(Schema.String),
  stats: Schema.optional(Stats),
});
export type Result = Schema.Schema.Type<typeof Result>;

/**
 * Runs scripts.
 *
 * One seam, several backends: in-process evaluation, a worker thread that can be terminated, a
 * workerd isolate that contains the code, and the process runtime, which routes a request to
 * whichever runtime hosts the script process (`ScriptProcess` in `@dxos/compute-runtime`).
 */
export interface Runner {
  readonly run: (request: Request) => Effect.Effect<Result, RunnerError>;
}

/** The ambient {@link Runner}, so a deployment chooses where scripts execute without touching callers. */
export class Service extends Context.Service<Service, Runner>()('@dxos/compute/ScriptRunner') {}

/** Runs `request` through the ambient {@link Service}. */
export const run = (request: Request): Effect.Effect<Result, RunnerError, Service> =>
  Effect.flatMap(Service, (runner) => runner.run(request));

/** Installs `runner` as the ambient one. */
export const layer = (runner: Runner): Layer.Layer<Service> => Layer.succeed(Service, runner);

/**
 * Routes each request to the runner registered for its dialect, failing a dialect no backend claims.
 *
 * Dialect-keyed rather than one runner per deployment because the dialects differ in what their
 * bindings are, not in where they run: a host serving code-mode's two dialects needs both, in the
 * same place.
 */
export const byDialect = (runners: Partial<Record<Operation.Dialect, Runner>>): Runner => ({
  run: (request) =>
    Effect.gen(function* () {
      const dialect = yield* dialectOf(request.source);
      const runner = runners[dialect];
      if (runner === undefined) {
        return yield* Effect.fail(
          new RunnerError({
            message: `No runner for dialect "${dialect}"; this runtime serves ${Object.keys(runners).join(', ') || 'none'}.`,
            dialect,
          }),
        );
      }
      return yield* runner.run(request);
    }),
});

/**
 * The dialect a source is written in. A source naming a {@link Operation.ScriptRef} is TypeScript: a
 * `Script` object is what the script editor writes, and it compiles TypeScript.
 */
export const dialectOf = (source: Operation.ScriptSource): Effect.Effect<Operation.Dialect, RunnerError> =>
  Effect.succeed(Operation.isInlineScript(source) ? source.dialect : Operation.Dialects.TypeScript);

/**
 * The code a source holds: a snippet's own body, or the text of the `Script` object it points at.
 *
 * An object source is two hops — the script, then its text — and each is a ref load, so resolving one
 * needs the database the refs were read from; a snippet needs nothing, which is why a runner in
 * another runtime can be handed one whole.
 */
export const resolveSource = (
  source: Operation.ScriptSource,
): Effect.Effect<{ readonly code: string; readonly dialect: Operation.Dialect }, RunnerError> =>
  Effect.gen(function* () {
    if (Operation.isInlineScript(source)) {
      return { code: source.code, dialect: source.dialect };
    }
    const target = yield* Database.load(source.script).pipe(
      Effect.mapError((error) => new RunnerError({ message: `Script object did not load: ${String(error)}` })),
    );
    if (!Obj.instanceOf(Script.Script, target)) {
      return yield* Effect.fail(
        new RunnerError({ message: `A script source must point at a Script object: ${Obj.getTypename(target)}` }),
      );
    }
    const text = yield* Database.load(target.source).pipe(
      Effect.mapError((error) => new RunnerError({ message: `Script source did not load: ${String(error)}` })),
    );
    return { code: text.content, dialect: Operation.Dialects.TypeScript };
  });

/** The request that runs a script operation (see {@link Operation.ScriptDefinition}) on `input`. */
export const requestOf = (
  operation: Operation.ScriptDefinition.Any,
  input?: unknown,
  options?: Omit<Request, 'source' | 'input' | 'timeoutMs'>,
): Request => ({
  ...options,
  source: operation.source,
  ...(input !== undefined ? { input } : {}),
  ...(operation.timeout !== undefined ? { timeoutMs: operation.timeout } : {}),
});
