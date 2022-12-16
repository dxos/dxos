/**
 * Wraps a function provider in a function that will defer the execution of the provided function.
 *
 * Example:
 *
 * ```typescript
 * const fn = deferFunction(() => impl);
 *
 * // Impl can be defined after the usage.
 * const impl = () => {
 *  console.log('Hello World!')
 * }
 * ```
 */
//
// Copyright 2022 DXOS.org
//

export const deferFunction =
  <T extends (...args: any[]) => any>(fnProvider: () => T) =>
  (...args: Parameters<T>): ReturnType<T> =>
    fnProvider()(...args);
