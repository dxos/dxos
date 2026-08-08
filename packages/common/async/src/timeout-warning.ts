//
// Copyright 2020 DXOS.org
//

import { StackTrace } from '@dxos/debug';
import { log } from '@dxos/log';

/**
 * Logs a warning if the action takes longer than the specified timeout. No errors are thrown.
 *
 * @param timeout Timeout in milliseconds after which the warning is logged.
 * @param action Description of the action, included in the warning.
 * @param body Action which is timed.
 * @param context Structured data attached to the warning (e.g. `spaceId`, `tags`).
 */
export const warnAfterTimeout = async <T>(
  timeout: number,
  action: string,
  body: () => Promise<T>,
  context?: Record<string, unknown>,
): Promise<T> => {
  // Captured outside the timer so the trace names the caller rather than the timer callback.
  const stack = new StackTrace();
  const timeoutId = setTimeout(() => {
    log.warn(
      `Action \`${action}\` is taking more than ${timeout.toLocaleString()}ms to complete. This might be a bug.`,
      {
        ...context,
        action,
        timeout,
        stack: stack.getStack(),
      },
    );
  }, timeout);
  try {
    return await body();
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * A decorator that logs a warning if method execution time exceeds the specified timeout.
 *
 * ```typescript
 * class Foo {
 *   @timed(5_000)
 *   async doStuff() {
 *     // long task
 *   }
 * }
 * ```
 *
 * This is useful for debugging code that might deadlock.
 *
 * @param timeout Timeout in milliseconds after which the warning is logged.
 */
export function timed(timeout: number) {
  return (target: any, propertyName: string, descriptor: TypedPropertyDescriptor<(...args: any) => any>) => {
    const method = descriptor.value!;
    descriptor.value = function (this: any, ...args: any) {
      return warnAfterTimeout(timeout, `${target.constructor.name}.${propertyName}`, () => method.apply(this, args));
    };
  };
}
