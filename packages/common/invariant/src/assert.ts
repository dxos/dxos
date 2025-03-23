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
export const assertArgument: (condition: unknown, message: string) => asserts condition = (
  condition: unknown,
  message: string,
): asserts condition => {
  if (!condition) {
    throw new TypeError(message);
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
    throw new InvalidStateError(message);
  }
};

// TODO(dmaretskyi): Consider how this correlates to effect errors. Intuitively, this should be a defect, not a checked error.
export class InvalidStateError extends Error {
  constructor(message: string) {
    super(message);
  }
}
