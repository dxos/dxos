/**
 * Throws an unhandled error for the runtime to catch.
 * Does not cause stack unwinding.
 * Error will be thrown in the next microtask.
 */
//
// Copyright 2024 DXOS.org
//

export const throwUnhandledError = (error: Error) => {
  queueMicrotask(() => {
    throw error;
  });
};
