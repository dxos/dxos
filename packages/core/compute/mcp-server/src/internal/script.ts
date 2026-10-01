//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

/** A failure the script itself raised, reported back to the caller as output rather than failing the call. */
export class ScriptError extends Schema.TaggedError<ScriptError>('McpScriptError')('McpScriptError', {
  message: Schema.String,
}) {}

/** One evaluation: an async function body, the names in its scope, and its budget. */
export type EvaluateParams = {
  readonly code: string;
  readonly bindings: Readonly<Record<string, unknown>>;
  readonly timeout?: Duration.Input;
};

/** Runs a script's code; injected so a host chooses how contained that code is. */
export type Sandbox = {
  readonly evaluate: (params: EvaluateParams) => Effect.Effect<unknown, ScriptError>;
};

/** `AsyncFunction` is not a global binding, so it is reached through an async function's prototype. */
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

/**
 * Evaluates in this process via `new AsyncFunction`.
 *
 * NOT A SECURITY BOUNDARY: the code shares the host realm and reaches every global it has, so it is
 * only fit for a host whose caller already holds the host's authority (a local stdio server). The
 * timeout abandons the evaluation rather than stopping it, since nothing in-process can cancel it.
 */
export const inProcess: Sandbox = {
  evaluate: ({ code, bindings, timeout }) =>
    Effect.tryPromise({
      try: () => {
        const names = Object.keys(bindings);
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const fn = new AsyncFunction(...names, `'use strict';\n${code}`);
        const evaluation: Promise<unknown> = fn(...names.map((name) => bindings[name]));
        if (timeout === undefined) {
          return evaluation;
        }
        // Raced rather than interrupted: an uninterruptible `tryPromise` would hang `Effect.timeout`
        // for as long as the evaluation it was meant to bound.
        const deadline = rejectAfter(timeout);
        return Promise.race([evaluation, deadline.promise]).finally(deadline.cancel);
      },
      catch: (error) => new ScriptError({ message: describeFailure(error) }),
    }),
};

const rejectAfter = (timeout: Duration.Input): { promise: Promise<never>; cancel: () => void } => {
  const duration = Duration.fromInputUnsafe(timeout);
  let handle: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<never>((_, reject) => {
    handle = setTimeout(
      () => reject(new Error(`Script did not finish within ${Duration.format(duration)}; it was abandoned.`)),
      Duration.toMillis(duration),
    );
    // A deadline must never be the reason a host with nothing else pending stays alive.
    handle.unref?.();
  });
  return { promise, cancel: () => clearTimeout(handle) };
};

/** What the caller is told a failure was; a tagged error's detail lives in its fields, not `message`. */
export const describeFailure = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message.length > 0 ? error.message : [String(error), fields(error)].filter(Boolean).join(' ');
  }
  const text = String(error);
  return text.length > 0 && text !== '[object Object]' ? text : (fields(error) ?? 'Unknown failure.');
};

const fields = (error: unknown): string | undefined => {
  if (error === null || typeof error !== 'object') {
    return undefined;
  }
  try {
    const own = { ...error };
    return Object.keys(own).length > 0 ? JSON.stringify(own) : undefined;
  } catch {
    return undefined;
  }
};

/** Collects the lines a script printed, truncating once the budget is spent. */
export const makePrinter = (maxOutput: number) => {
  const lines: string[] = [];
  let printed = 0;
  let truncated = false;
  return {
    print: (...values: unknown[]): void => {
      if (truncated) {
        return;
      }
      const line = values.map(format).join(' ');
      // The joining newline counts, or a loop printing empty lines would grow the buffer for free.
      const separator = lines.length > 0 ? 1 : 0;
      if (printed + separator + line.length > maxOutput) {
        lines.push(`${line.slice(0, Math.max(0, maxOutput - printed - separator))}\n[output truncated]`);
        truncated = true;
        return;
      }
      printed += separator + line.length;
      lines.push(line);
    },
    isEmpty: () => lines.length === 0,
    output: () => lines.join('\n'),
  };
};

/** Strings verbatim, everything else as JSON the caller can read back. */
const format = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
};
