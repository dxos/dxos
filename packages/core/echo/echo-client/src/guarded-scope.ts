//
// Copyright 2024 DXOS.org
//

/**
 * @deprecated Signals have been removed. This function is now a no-op.
 */
export const prohibitSignalActions = <T>(cb: () => T): T => {
  return cb();
};
