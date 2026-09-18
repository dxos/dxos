//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

/**
 * A failure the model's own code raised. Reported back to the model as output rather than failing
 * the turn, so its next move is to read the message and write different code.
 */
export class EvaluationError extends Schema.TaggedError<EvaluationError>('EvaluationError')('EvaluationError', {
  message: Schema.String,
}) {}

export type EvaluateParams = {
  /** The body of an async function, as the dialect wrapped it. */
  readonly code: string;
  /** Names bound in the code's scope. */
  readonly bindings: Record<string, unknown>;
  /** Abandons the evaluation after this long; absent means no bound. */
  readonly timeout?: Duration.Input;
};

/**
 * Runs model-authored code.
 *
 * Injected rather than inlined because where the code runs is expected to change: the in-process
 * implementation below is the cheapest one, and a `node:vm` context, a worker thread (so a long
 * evaluation cannot stall the turn's thread) or a Cloudflare worker-loader isolate all satisfy the
 * same interface.
 *
 * NOTE: `bindings` are live JavaScript values, which an in-process implementation passes through
 * directly. An out-of-process implementation cannot: it has to marshal them, so it can carry
 * functions (as RPC stubs) and plain data, but not live ECHO objects or module namespaces. That is
 * the line between the two dialects — see `Dialect`.
 */
export interface Sandbox {
  readonly evaluate: (params: EvaluateParams) => Effect.Effect<unknown, EvaluationError>;
}

export class Service extends Context.Service<Service, Sandbox>()('@dxos/agent-runtime/Sandbox') {}

/** `AsyncFunction` is not a global binding, so it is reached through an async function's prototype. */
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

/**
 * Evaluates in this process, in this thread, via `new AsyncFunction`.
 *
 * The timeout ABANDONS the evaluation rather than stopping it: nothing in this process can cancel
 * a running function, so the code keeps going — holding its bindings, and still able to write to
 * the database — with only its result discarded. A synchronous loop is worse still, since it blocks
 * the thread and the timeout cannot even be observed until it exits. Both are why the sandbox is an
 * injected dependency: an isolate or worker can actually be terminated.
 */
export const inProcess: Sandbox = {
  evaluate: ({ code, bindings, timeout }) =>
    Effect.tryPromise({
      try: () => {
        const names = Object.keys(bindings);
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const fn = new AsyncFunction(...names, `'use strict';\n${code}`);
        const evaluation: Promise<unknown> = fn(...names.map((name) => bindings[name]));
        // Raced rather than interrupted: `Effect.timeout` would have to interrupt a fiber blocked
        // in an uninterruptible `tryPromise`, so the call would hang for exactly as long as the
        // evaluation it was meant to bound.
        return timeout === undefined ? evaluation : Promise.race([evaluation, rejectAfter(timeout)]);
      },
      catch: (error) => new EvaluationError({ message: error instanceof Error ? error.message : String(error) }),
    }),
};

const rejectAfter = (timeout: Duration.Input): Promise<never> => {
  const duration = Duration.fromInputUnsafe(timeout);
  return new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`Evaluation did not finish within ${Duration.format(duration)}; it was abandoned.`)),
      Duration.toMillis(duration),
    ),
  );
};

/** Installs {@link inProcess} as the ambient sandbox. */
export const layerInProcess: Layer.Layer<Service> = Layer.succeed(Service, inProcess);
