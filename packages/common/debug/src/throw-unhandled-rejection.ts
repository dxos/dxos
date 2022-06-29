//
// Copyright 2022 DXOS.org
//

/**
 * Asynchronously produces an unhandled rejection.
 *
 * Will terminate the node process with an error.
 * In browser results in an error message in the console.
 * In mocha tests it fails the currently running test.
 */
export const throwUnhandledRejection = (error: Error) => {
  setTimeout(() => {
    throw error;
  });
};
