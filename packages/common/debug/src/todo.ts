//
// Copyright 2020 DXOS.org
//

/**
 * Throws an error. Can be used in an expression instead of a value
 */
export const todo = (message?: string): never => {
  throw new Error(message ?? 'Not implemented.');
};
