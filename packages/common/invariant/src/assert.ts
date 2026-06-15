//
// Copyright 2025 DXOS.org
//

/**
 * Use this to assert the arguments of a function.
 *
 * @example
 * ```ts
 * function foo(arg: string) {
 *   assertArgument(typeof arg === 'string', 'arg must be a string');
 * }
 * ```
 */
// TODO(dmaretskyi): Rename assertParameter.
export const assertArgument: (condition: unknown, argumentName: string, message?: string) => asserts condition = (
  condition: unknown,
  argumentName: string,
  message?: string,
): asserts condition => {
  if (!condition) {
    const error = new TypeError(`Invalid argument \`${argumentName}\`` + (message ? `: ${message}` : ''));
    Error.captureStackTrace(error, assertArgument);
    throw error;
  }
};

/**
 * Use this to assert the state of an object.
 *
 * @example
 * ```ts
 * class Foo {
 *   private _bar: boolean;
 *
 *   public get bar() {
 *     assertState(this._bar, 'bar must be true');
 *     return this._bar;
 *   }
 * }
 *
 * const foo = new Foo();
 * foo.bar = false; // This will throw an InvalidStateError
 * ```
 */
export const assertState: (condition: unknown, message: string) => asserts condition = (
  condition: unknown,
  message: string,
): asserts condition => {
  if (!condition) {
    const error = new InvalidStateError(message);
    Error.captureStackTrace(error, assertState);
    throw error;
  }
};

// TODO(dmaretskyi): Consider how this correlates to effect errors. Intuitively, this should be a defect, not a checked error.
export class InvalidStateError extends Error {}
