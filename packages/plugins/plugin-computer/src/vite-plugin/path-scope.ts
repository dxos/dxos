//
// Copyright 2026 DXOS.org
//

import * as fs from 'node:fs';
import * as path from 'node:path';

import { ComputerShellError } from '#shell';

/**
 * Resolves a requested working directory against the host's root, refusing anything outside it.
 *
 * This scopes where a script *starts*, not what it can reach: the tool runs bash, so nothing stops a
 * script from walking upwards on its own. What the check does buy is that a caller cannot silently
 * retarget the host at another tree — an attempt is an error rather than a directory substitution,
 * which would otherwise look like a successful run against the wrong files.
 */
export const resolveWithin = (root: string, requested?: string): string => {
  // Real paths on both sides: a symlink inside the root pointing out of it would otherwise pass a
  // plain prefix test.
  const realRoot = fs.realpathSync(path.resolve(root));
  if (requested === undefined || requested === '') {
    return realRoot;
  }

  let real: string;
  try {
    real = fs.realpathSync(path.resolve(realRoot, requested));
  } catch {
    throw new ComputerShellError({ message: 'cwd does not exist', context: { root, requested } });
  }
  if (real !== realRoot && !real.startsWith(realRoot + path.sep)) {
    throw new ComputerShellError({ message: 'cwd is outside the configured root', context: { root, requested } });
  }

  return real;
};
