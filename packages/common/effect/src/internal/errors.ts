//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Option from 'effect/Option';
import type * as Tracer from 'effect/Tracer';

import * as GlobalValue from './GlobalValue.ts';

const spanSymbol = Symbol.for('effect/SpanAnnotation');
const spanToTrace = GlobalValue.globalValue('effect/Tracer/spanToTrace', () => new WeakMap());
const locationRegex = /\((.*)\)/g;

/**
 * Adds effect spans.
 * Removes effect internal functions.
 * Unwraps error proxy.
 */
const prettyErrorStack = (error: any, appendStacks: string[] = []): any => {
  if (typeof error !== 'object' || error === null) {
    return error;
  }

  const span = error[spanSymbol];

  const lines = typeof error.stack === 'string' ? error.stack.split('\n') : [];
  const out = [];

  // Very hacky way to remove effect runtime internal stack frames.
  let atStack = false,
    inCore = false,
    passedScheduler = false;
  for (let i = 0; i < lines.length; i++) {
    if (!atStack && !lines[i].startsWith('    at ')) {
      out.push(lines[i]);
      continue;
    }
    atStack = true;

    if (lines[i].includes(' at new BaseEffectError') || lines[i].includes(' at new YieldableError')) {
      i++;
      continue;
    }
    if (lines[i].includes('Generator.next')) {
      break;
    }
    if (lines[i].includes('effect_internal_function')) {
      break;
    }

    const filename = lines[i].match(/\/([a-zA-Z0-9_\-.]+):\d+:\d+\)$/)?.[1];

    if (!inCore && ['core-effect.ts'].includes(filename)) {
      inCore = true;
    }

    if (inCore && !passedScheduler && ['Scheduler.ts'].includes(filename)) {
      passedScheduler = true;
      continue;
    }

    if (passedScheduler && !['Scheduler.ts'].includes(filename)) {
      inCore = false;
    }

    if (inCore) {
      continue;
    }

    out.push(
      lines[i]
        .replace(/at .*effect_instruction_i.*\((.*)\)/, 'at $1')
        .replace(/EffectPrimitive\.\w+/, '<anonymous>')
        .replace(/at Arguments\./, 'at '),
    );
  }

  if (span) {
    let current: Tracer.Span | Tracer.AnySpan | undefined = span;
    let i = 0;
    while (current && current._tag === 'Span' && i < 10) {
      const stackFn = spanToTrace.get(current);
      if (typeof stackFn === 'function') {
        const stack = stackFn();
        if (typeof stack === 'string') {
          const locationMatchAll = stack.matchAll(locationRegex);
          let match = false;
          for (const [, location] of locationMatchAll) {
            match = true;
            out.push(`    at ${current.name} (${location})`);
          }
          if (!match) {
            out.push(`    at ${current.name} (${stack.replace(/^at /, '')})`);
          }
        } else {
          out.push(`    at ${current.name}`);
        }
      } else {
        out.push(`    at ${current.name}`);
      }
      current = Option.getOrUndefined(current.parent);
      i++;
    }
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
    const errors = [
      ...cause.reasons.filter(Cause.isFailReason).map((reason) => reason.error),
      ...cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect),
    ];

    const getStackFrames = (): string[] => {
      // Bun requies the target object for `captureStackTrace` to be an Error.
      const err = new Error();
      Error.captureStackTrace(err, causeToError);
      return err.stack!.split('\n').slice(1);
    };

    const stackFrames = getStackFrames();
    const newErrors = errors.map((error) => prettyErrorStack(error, stackFrames));

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
