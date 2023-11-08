//
// Copyright 2023 DXOS.org
//

import { type CallMetadata } from './meta';

export type InvariantFn = (condition: unknown, message?: string, meta?: CallMetadata) => asserts condition;

/**
 * Asserts that the condition is true.
 *
 * @param message Optional message.
 */
export const invariant: InvariantFn = (
  condition: unknown,
  message?: string,
  meta?: CallMetadata,
): asserts condition => {
  if (condition) {
    return;
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

  throw new InvariantViolation(errorMessage);
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
