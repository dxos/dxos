//
// Copyright 2020 DXOS.org
//

import { StackTrace } from './stack-trace';

/**
 * Prints a warning to console if the action takes longer then specified timeout. No errors are thrown.
 *
 * @param timeout Timeout in milliseconds after which warning is printed.
 * @param context Context description that would be included in the printed message.
 * @param body Action which is timed.
 */
export const warnAfterTimeout = async <T>(timeout: number, context: string, body: () => Promise<T>): Promise<T> => {
  const stack = new StackTrace();
  const timeoutId = setTimeout(() => {
    console.warn(
      `Action \`${context}\` is taking more then ${timeout.toLocaleString()}ms to complete. This might be a bug.\n${stack.getStack()}`,
    );
  }, timeout);
  try {
    return await body();
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * A decorator that prints a warning to console if method execution time exceeds specified timeout.
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
 * @param timeout Timeout in milliseconds after which the warning is printed.
 */
export function timed(timeout: number) {
  return (target: any, propertyName: string, descriptor: TypedPropertyDescriptor<(...args: any) => any>) => {
    const method = descriptor.value!;
    descriptor.value = function (this: any, ...args: any) {
      return warnAfterTimeout(timeout, `${target.constructor.name}.${propertyName}`, () => method.apply(this, args));
    };
  };
}
