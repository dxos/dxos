//
// Copyright 2021 DXOS.org
//

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
// TODO(burdon): Rename failIfUndefined().
export const failUndefined = () => {
  throw new Error('Required value was null or undefined.');
};
