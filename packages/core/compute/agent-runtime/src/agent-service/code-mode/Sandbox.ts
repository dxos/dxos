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
 * implementation below is the cheapest one and NOT a security boundary (see its note), while a
 * worker thread (so a long evaluation cannot stall the turn's thread) or a Cloudflare
 * worker-loader isolate can actually contain and terminate what they run. `node:vm` is not one of
 * those: it shares the host realm and its own documentation says it must not be used to run
 * untrusted code.
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
 * NOT A SECURITY BOUNDARY, despite the interface's name. `bindings` shadow the names they cover,
 * but the function is compiled in this realm and reaches every global the host has — `process`,
 * `process.env`, `fetch`, timers — so code mode is only as contained as the model driving it.
 * Containing genuinely untrusted code needs an implementation with a real boundary, which is what
 * this interface exists to accept; nothing done here can substitute for one.
 *
 * The timeout ABANDONS the evaluation rather than stopping it: nothing in this process can cancel
 * a running function, so the code keeps going — holding its bindings, and still able to write to
 * the database — with only its result discarded. A synchronous loop is worse still, since it blocks
 * the thread and the timeout cannot even be observed until it exits.
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
      catch: (error) => new EvaluationError({ message: describeFailure(error) }),
    }),
};

/**
 * What the model is told the failure was.
 *
 * A typed error carries its detail in its fields rather than in `message` — an Effect
 * `Schema.TaggedError` has an empty `message` unless one is declared — so reading `message` alone
 * reports `Error:` and nothing else, which the model cannot act on.
 */
const describeFailure = (error: unknown): string => {
  if (error instanceof Error) {
    // `String(error)` on a tagged error names the tag and nothing else, so the fields carrying
    // what actually went wrong are appended when the message is empty.
    return error.message.length > 0 ? error.message : [String(error), fields(error)].filter(Boolean).join(' ');
  }
  const text = String(error);
  return text.length > 0 && text !== '[object Object]' ? text : (fields(error) ?? 'Unknown failure.');
};

/** An error's own enumerable properties, as JSON, or undefined when it has none worth printing. */
const fields = (error: unknown): string | undefined => {
  try {
    const own = { ...(error as object) };
    return Object.keys(own).length > 0 ? JSON.stringify(own) : undefined;
  } catch {
    return undefined;
  }
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
