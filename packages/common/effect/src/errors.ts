//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as GlobalValue from 'effect/GlobalValue';
import * as Option from 'effect/Option';
import type { AnySpan, Span } from 'effect/Tracer';

const spanSymbol = Symbol.for('effect/SpanAnnotation');
const originalSymbol = Symbol.for('effect/OriginalAnnotation');
const spanToTrace = GlobalValue.globalValue('effect/Tracer/spanToTrace', () => new WeakMap());
const locationRegex = /\((.*)\)/g;

/**
 * Adds effect spans.
 * Removes effect internal functions.
 * Unwraps error proxy.
 */
const prettyErrorStack = (error: any, appendStacks: string[] = []): any => {
  const span = error[spanSymbol];

  const lines = typeof error.stack === 'string' ? error.stack.split('\n') : [];
  const out = [];

  let atStack = false;
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
    out.push(
      lines[i]
        .replace(/at .*effect_instruction_i.*\((.*)\)/, 'at $1')
        .replace(/EffectPrimitive\.\w+/, '<anonymous>')
        .replace(/at Arguments\./, 'at '),
    );
  }

  if (span) {
    let current: Span | AnySpan | undefined = span;
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

  if (error[originalSymbol]) {
    error = error[originalSymbol];
  }
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
  if (Cause.isEmpty(cause)) {
    return new Error('Fiber failed without a cause');
  } else if (Cause.isInterruptedOnly(cause)) {
    return new Error('Fiber was interrupted');
  } else {
    const errors = [...Chunk.toArray(Cause.failures(cause)), ...Chunk.toArray(Cause.defects(cause))];

    const getStackFrames = (): string[] => {
      const o: { stack: string } = {} as any;
      Error.captureStackTrace(o, getStackFrames);
      return o.stack.split('\n').slice(1);
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

/**
 * Like `Effect.promise` but also caputes spans for defects.
 * Workaround for: https://github.com/Effect-TS/effect/issues/5436
 */
export const promiseWithCauseCapture: <A>(evaluate: (signal: AbortSignal) => PromiseLike<A>) => Effect.Effect<A> = (
  evaluate,
) =>
  Effect.promise(async (signal) => {
    try {
      const result = await evaluate(signal);
      return Effect.succeed(result);
    } catch (err) {
      return Effect.die(err);
    }
  }).pipe(Effect.flatten);
