//
// Copyright 2023 DXOS.org
//

import { type CallMetadata } from './meta';

export type InvariantFn = (condition: unknown, message?: string, meta?: CallMetadata) => asserts condition;

/**
 * Asserts that the condition is true.
 *
 * @param message Optional message. If it starts with "BUG" then the program will break if this invariant fails if the debugger is attached.
 */
export const invariant: InvariantFn = (
  condition: unknown,
  message?: string,
  meta?: CallMetadata,
): asserts condition => {
  if (condition) {
    return;
  }

  if (message?.startsWith('BUG')) {
    // This invariant is a debug bug-check: break if the debugger is attached.
    // eslint-disable-next-line no-debugger
    debugger;
  }

  let errorMessage = 'invariant violation';

  if (message) {
    errorMessage += `: ${message}`;
  }

  if (meta?.A) {
    errorMessage += ` [${meta.A[0]}]`;
  }

  if (meta?.F) {
    errorMessage += ` at ${getRelativeFilename(meta.F)}:${meta.L}`;
  }

  const error = new InvariantViolation(errorMessage);

  // Do not include the invariant function in the stack trace.
  Error.captureStackTrace(error, invariant);

  throw error;
};

export class InvariantViolation extends Error {
  constructor(message: string) {
    super(message);
    // NOTE: Restores prototype chain (https://stackoverflow.com/a/48342359).
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const getRelativeFilename = (filename: string) => {
  // TODO(burdon): Hack uses "packages" as an anchor (pre-parse NX?)
  // Including `packages/` part of the path so that excluded paths (e.g. from dist) are clickable in vscode.
  const match = filename.match(/.+\/(packages\/.+\/.+)/);
  if (match) {
    const [, filePath] = match;
    return filePath;
  }

  return filename;
};

export const failedInvariant = (message1?: unknown, message2?: string, meta?: CallMetadata): never => {
  let errorMessage = 'invariant violation';

  const message = [message1, message2].filter((str) => typeof str === 'string').join(' ');
  if (message) {
    errorMessage += `: ${message}`;
  }

  if (meta?.A) {
    errorMessage += ` [${meta.A[0]}]`;
  }

  if (meta?.F) {
    errorMessage += ` at ${getRelativeFilename(meta.F)}:${meta.L}`;
  }

  throw new InvariantViolation(errorMessage);
};

/**
 * Code should never reach this point.
 */
export const unreachable = failedInvariant;
