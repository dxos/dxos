//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import type { BindingsContext, Dialect } from './Dialect.ts';

/**
 * A failure the model's own code raised. Reported back to the model as output rather than failing
 * the turn, so its next move is to read the message and write different code.
 */
export class EvaluationError extends Schema.TaggedError<EvaluationError>('EvaluationError')('EvaluationError', {
  message: Schema.String,
}) {}

/** One evaluation: the model's code, what it runs against, and the budget it may take. */
export type EvaluateParams = {
  /** The body of an async function, as the dialect wrapped it. */
  readonly code: string;
  /**
   * The dialect whose bindings the code is written against. Passed rather than its bindings,
   * because an out-of-process sandbox builds them on the far side — against its own database —
   * and only the dialect's identity can cross.
   */
  readonly dialect: Dialect;
  /** What the bindings are built from, wherever they are built. */
  readonly context: BindingsContext;
  /** Bounds the evaluation; absent means no bound. What "bounds" means is the implementation's. */
  readonly timeout?: Duration.Input;
};

/**
 * Runs model-authored code.
 *
 * Injected rather than inlined because where the code runs is expected to change: the in-process
 * implementation below is the cheapest one and NOT a security boundary (see its note), while
 * `WorkerSandbox` runs the code on a worker thread and can therefore terminate it, and a
 * Cloudflare worker-loader isolate would go further and contain it. `node:vm` is not one of those:
 * it shares the host realm and its own documentation says it must not be used to run untrusted
 * code.
 *
 * NOTE: `bindings` are live JavaScript values, which an in-process implementation passes through
 * directly. An out-of-process implementation cannot: it has to marshal them, so it can carry
 * functions (as RPC stubs) and plain data, but not live ECHO objects or module namespaces. That is
 * the line between the two dialects — see `Dialect`.
 */
export interface Sandbox {
  readonly evaluate: (params: EvaluateParams) => Effect.Effect<unknown, EvaluationError>;
}

/** The ambient {@link Sandbox}, so a deployment chooses the execution seam without touching the producer. */
export class Service extends Context.Service<Service, Sandbox>()('@dxos/agent-code-mode/Sandbox') {}

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
  evaluate: ({ code, dialect, context, timeout }) =>
    Effect.tryPromise({
      try: () => {
        const bindings = dialect.bindings(context);
        const names = Object.keys(bindings);
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const fn = new AsyncFunction(...names, `'use strict';\n${code}`);
        const evaluation: Promise<unknown> = fn(...names.map((name) => bindings[name]));
        if (timeout === undefined) {
          return evaluation;
        }
        // Raced rather than interrupted: `Effect.timeout` would have to interrupt a fiber blocked
        // in an uninterruptible `tryPromise`, so the call would hang for exactly as long as the
        // evaluation it was meant to bound.
        const deadline = rejectAfter(timeout);
        // The timer holds the event loop open until it fires, so an evaluation that finished in
        // milliseconds would otherwise keep the process alive for the rest of its budget.
        return Promise.race([evaluation, deadline.promise]).finally(deadline.cancel);
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

/** The deadline half of the race, with the handle to clear once the race is decided. */
const rejectAfter = (timeout: Duration.Input): { promise: Promise<never>; cancel: () => void } => {
  const duration = Duration.fromInputUnsafe(timeout);
  let handle: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<never>((_, reject) => {
    handle = setTimeout(
      () => reject(new Error(`Evaluation did not finish within ${Duration.format(duration)}; it was abandoned.`)),
      Duration.toMillis(duration),
    );
    // Unref'd because the deadline exists to bound an evaluation, never to be a reason the host
    // stays alive: a process with nothing else pending should exit rather than serve out the budget.
    handle.unref?.();
  });
  return { promise, cancel: () => clearTimeout(handle) };
};

/** Installs {@link inProcess} as the ambient sandbox. */
export const layerInProcess: Layer.Layer<Service> = Layer.succeed(Service, inProcess);
