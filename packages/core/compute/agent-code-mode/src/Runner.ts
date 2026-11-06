//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Context from 'effect/Context';
import type * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Result from 'effect/Result';

import type * as Operation from '@dxos/compute/Operation';
import * as ScriptRunner from '@dxos/compute/ScriptRunner';
import type { Database } from '@dxos/echo';

import { EffectDialect } from './dialect-effect.ts';
import { PlainDialect } from './dialect-plain.ts';
import type { Dialect, SandboxOperation } from './Dialect.ts';
import { evaluate } from './eval-tool.ts';
import type * as Sandbox from './Sandbox.ts';

/** The dialects code mode serves, keyed by the name a {@link ScriptRunner.Request} names them by. */
export const DIALECTS: Partial<Record<Operation.Dialect, Dialect>> = {
  plain: PlainDialect,
  effect: EffectDialect,
};

/** What binds a runner to a workspace: where code runs, what it runs against, and its budget. */
export type Options = {
  /**
   * Where the code is evaluated. `Sandbox.inProcess` is the cheapest and is not a boundary;
   * `WorkerSandbox` runs it on a thread it can terminate, and `WorkerdSandbox` contains it.
   */
  readonly sandbox: Sandbox.Sandbox;
  /** Services the code runs against: the database it reads and writes, and `Operation.invoke`'s handler. */
  readonly runtime: Context.Context<Database.Service | Operation.Service>;
  readonly operations: readonly SandboxOperation[];
  /** Dialects this runner serves; defaults to {@link DIALECTS}. */
  readonly dialects?: Partial<Record<Operation.Dialect, Dialect>>;
  /** Keys of the skills the conversation has bound; see `BindingsContext.skills`. */
  readonly skills?: readonly string[];
  readonly maxOutput?: number;
  readonly timeout?: Duration.Input;
};

/**
 * A {@link ScriptRunner.Runner} over code mode's dialects and sandboxes.
 *
 * This is the seam between the two: a script's dialect names which of code mode's languages its body
 * is written in, and everything the body is written AGAINST — the database, the skills' operations —
 * is the runner's, because a request is serializable and a workspace is not.
 */
export const make = (options: Options): ScriptRunner.Runner => {
  const dialects = options.dialects ?? DIALECTS;
  return {
    run: (request) =>
      Effect.gen(function* () {
        const { code, dialect } = yield* ScriptRunner.resolveSource(request.source);
        const resolved = dialects[dialect];
        if (resolved === undefined) {
          return yield* Effect.fail(
            new ScriptRunner.RunnerError({
              message: `Code mode does not serve dialect "${dialect}"; it serves ${Object.keys(dialects).join(', ')}.`,
              dialect,
            }),
          );
        }

        const maxOutput = request.maxOutput ?? options.maxOutput;
        const timeout: Duration.Input | undefined = request.timeoutMs ?? options.timeout;
        const result = yield* evaluate({
          code,
          // `input` is bound beside the dialect's own names so a script operation's input reaches its
          // body. In-process only: an out-of-process sandbox is sent the dialect's NAME and builds its
          // bindings on the far side, so a wrapped dialect does not cross — see `WorkerSandbox`.
          dialect: {
            ...resolved,
            bindings: (context) => ({ ...resolved.bindings(context), input: request.input }),
          },
          sandbox: options.sandbox,
          runtime: options.runtime,
          operations: options.operations,
          ...(options.skills !== undefined ? { skills: options.skills } : {}),
          ...(maxOutput !== undefined ? { maxOutput } : {}),
          ...(timeout !== undefined ? { timeout } : {}),
        }).pipe(Effect.result);

        // A script that failed is a result, not a failure of the call: the caller is meant to read
        // the message — the model writes different code, a person at `dx eval` fixes theirs.
        return Result.isSuccess(result)
          ? { output: result.success }
          : { output: result.failure, error: errorLine(result.failure) };
      }),
  };
};

/** Installs a code-mode runner as the ambient {@link ScriptRunner.Service}. */
export const layer = (options: Options): Layer.Layer<ScriptRunner.Service> => ScriptRunner.layer(make(options));

/**
 * The failure's own line out of the text the model is shown, which is the printed output with the
 * error appended. The whole text when no line names an error, so nothing is lost either way.
 */
const errorLine = (output: string): string => {
  const line = output
    .split('\n')
    .reverse()
    .find((line) => line.startsWith('Error:'));
  return line ?? output;
};
