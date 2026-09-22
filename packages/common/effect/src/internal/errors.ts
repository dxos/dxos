//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import type * as References from 'effect/References';

const locationRegex = /\((.*)\)/g;

/** Frames up to the first effect runtime frame; runtime functions carry `~effect/*` names, except the caller's `~effect/Effect/args` thunk. */
const userFrames = (lines: readonly string[]): string[] => {
  const out = [];
  for (const line of lines) {
    if (/Generator\.next|~effect\/(?!Effect\/args\b)/.test(line)) {
      break;
    }
    // The receiver the thunk is invoked on is a runtime detail (`Object`, `PrimitiveImpl`, ...), so
    // the frame is matched on the thunk's own name.
    out.push(
      line.replace(/at (?:\S+\.)?~effect\/Effect\/args \((.*)\)$/, 'at $1').replace(' [as ~effect/Effect/args]', ''),
    );
  }
  return out;
};

/**
 * Adds effect spans.
 * Removes effect internal functions.
 */
const prettyErrorStack = (error: any, frame?: References.StackFrame, appendStacks: string[] = []): any => {
  if (typeof error !== 'object' || error === null) {
    return error;
  }

  const lines: string[] = typeof error.stack === 'string' ? error.stack.split('\n') : [];
  const stackStart = lines.findIndex((line) => line.startsWith('    at '));
  const out = stackStart === -1 ? lines : [...lines.slice(0, stackStart), ...userFrames(lines.slice(stackStart))];

  let current = frame;
  for (let i = 0; current && i < 10; i++) {
    const stack = current.stack();
    if (stack) {
      let match = false;
      for (const [, location] of stack.matchAll(locationRegex)) {
        match = true;
        out.push(`    at ${current.name} (${location})`);
      }
      if (!match) {
        out.push(`    at ${current.name} (${stack.replace(/^at /, '')})`);
      }
    } else {
      out.push(`    at ${current.name}`);
    }
    current = current.parent;
  }

  out.push(...appendStacks);

  if (error.cause) {
    error.cause = prettyErrorStack(error.cause);
  }

  Object.defineProperty(error, 'stack', {
    value: out.join('\n'),
    writable: true,
    enumerable: false,
    configurable: true,
  });

  return error;
};

/**
 * Converts a cause to an error.
 * Inserts effect spans as stack frames.
 * The error will have stack frames of where the effect was run (if stack trace limit allows).
 * Removes effect runtime internal stack frames.
 *
 * To be used in place of `Effect.runPromise`.
 *
 * @throws AggregateError if there are multiple errors.
 */
export const causeToError = (cause: Cause.Cause<any>): Error => {
  if (cause.reasons.length === 0) {
    return new Error('Fiber failed without a cause');
  } else if (Cause.hasInterruptsOnly(cause)) {
    return new Error('Fiber was interrupted');
  } else {
    const getStackFrames = (): string[] => {
      // Bun requies the target object for `captureStackTrace` to be an Error.
      const err = new Error();
      Error.captureStackTrace(err, causeToError);
      return userFrames(err.stack!.split('\n').slice(1));
    };

    const stackFrames = getStackFrames();
    const pretty = (error: unknown, reason: Cause.Reason<unknown>) =>
      prettyErrorStack(error, Context.getOrUndefined(Cause.reasonAnnotations(reason), Cause.StackTrace), stackFrames);
    const newErrors = [
      ...cause.reasons.filter(Cause.isFailReason).map((reason) => pretty(reason.error, reason)),
      ...cause.reasons.filter(Cause.isDieReason).map((reason) => pretty(reason.defect, reason)),
    ];

    if (newErrors.length === 1) {
      return newErrors[0];
    } else {
      return new AggregateError(newErrors);
    }
  }
};

/**
 * Throws an error based on the cause.
 * Inserts effect spans as stack frames.
 * The error will have stack frames of where the effect was run (if stack trace limit allows).
 * Removes effect runtime internal stack frames.
 *
 * To be used in place of `Effect.runPromise`.
 *
 * @throws AggregateError if there are multiple errors.
 */
export const throwCause = (cause: Cause.Cause<any>): never => {
  throw causeToError(cause);
};

export const unwrapExit = <A>(exit: Exit.Exit<A, any>): A => {
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  return throwCause(exit.cause);
};

/**
 * Runs the embedded effect asynchronously and throws any failures and defects as errors.
 * Inserts effect spans as stack frames.
 * The error will have stack frames of where the effect was run (if stack trace limit allows).
 * Removes effect runtime internal stack frames.
 *
 * To be used in place of `Effect.runPromise`.
 *
 * @throws AggregateError if there are multiple errors.
 */
export const runAndForwardErrors = async <A, E>(
  effect: Effect.Effect<A, E, never>,
  options?: { signal?: AbortSignal },
): Promise<A> => {
  const exit = await Effect.runPromiseExit(effect, options);
  return unwrapExit(exit);
};

/** Alias for {@link runAndForwardErrors} — preferred name when accessed via `EffectEx.runPromise`. */
export const runPromise = runAndForwardErrors;

/**
 * Runs a fire-and-forget effect whose fiber may be interrupted by teardown (component unmount,
 * plugin-manager shutdown): interruption-only exits are absorbed, while failures and defects
 * still surface as unhandled rejections (via {@link unwrapExit}) so real bugs are not silenced.
 */
export const runDetached = <A, E>(effect: Effect.Effect<A, E, never>): void => {
  void Effect.runPromiseExit(effect).then((exit) => {
    if (Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
      unwrapExit(exit);
    }
  });
};

/**
 * Runs the embedded effect asynchronously and throws any failures and defects as errors.
 */
export const runInRuntime: {
  <R>(
    runtime: ManagedRuntime.ManagedRuntime<R, never>,
  ): <A, E>(effect: Effect.Effect<A, E, R>, options?: { signal?: AbortSignal } | undefined) => Promise<A>;
  <R, A, E>(
    runtime: ManagedRuntime.ManagedRuntime<R, never>,
    effect: Effect.Effect<A, E, R>,
    options?: { signal?: AbortSignal } | undefined,
  ): Promise<A>;
} = (...args: any[]): any => {
  if (args.length === 1) {
    const [runtime] = args as [ManagedRuntime.ManagedRuntime<any, never>];
    return async (
      effect: Effect.Effect<any, any, any>,
      options?: { signal?: AbortSignal } | undefined,
    ): Promise<any> => {
      const exit = await runtime.runPromiseExit(effect, options);
      return unwrapExit(exit);
    };
  } else {
    const [runtime, effect, options] = args as [
      ManagedRuntime.ManagedRuntime<any, never>,
      Effect.Effect<any, any, any>,
      { signal?: AbortSignal } | undefined,
    ];
    return (async () => {
      const exit = await runtime.runPromiseExit(effect, options);
      return unwrapExit(exit);
    })();
  }
};
