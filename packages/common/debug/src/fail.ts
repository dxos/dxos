/**
 * Should be used in expressions where values are cheked not to be null or undefined.
 *
 * Example:
 *
 * ```
 * const value: string | undefined;
 *
 * callMethod(value ?? failUndefined());
 * ```
 */
//
// Copyright 2021 DXOS.org
//

export const failUndefined = () => {
  throw new Error('Required value was null or undefined.');
};
