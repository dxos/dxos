//
// Copyright 2025 DXOS.org
//

import { Cause, Chunk, Effect, Exit, GlobalValue, Option } from 'effect';
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

  Object.defineProperty(error, 'stack', {
    value: out.join('\n'),
    writable: true,
    enumerable: false,
    configurable: true,
  });

  return error;
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
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  if (Cause.isEmpty(exit.cause)) {
    throw new Error('Fiber failed without a cause');
  } else if (Cause.isInterrupted(exit.cause)) {
    throw new Error('Fiber was interrupted');
  } else {
    const errors = [...Chunk.toArray(Cause.failures(exit.cause)), ...Chunk.toArray(Cause.defects(exit.cause))];

    const getStackFrames = (): string[] => {
      const o: { stack: string } = {} as any;
      Error.captureStackTrace(o, getStackFrames);
      return o.stack.split('\n').slice(1);
    };

    const stackFrames = getStackFrames();
    const newErrors = errors.map((error) => prettyErrorStack(error, stackFrames));

    if (newErrors.length === 1) {
      throw newErrors[0];
    } else {
      throw new AggregateError(newErrors);
    }
  }
};
