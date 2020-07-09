//
// Copyright 2020 DxOS.org
//

/**
 * Immediatelly throws an error passed as an argument.
 *
 * Usefull for throwing errors from inside expressions.
 * For example:
 * ```
 * const item = model.getById(someId) ?? raise(new Error('Not found'));
 * ```
 * @param error
 */
export const raise = (error: Error): never => {
  throw error;
};
